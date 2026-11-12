import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, StaffDutyStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateHospitalShiftDto } from './dto/create-hospital-shift.dto.js';
import { CreateStaffDutyDto } from './dto/create-staff-duty.dto.js';
import { QueryStaffDutiesDto } from './dto/query-staff-duties.dto.js';

@Injectable()
export class StaffRostersService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAccess(hospitalId: string, userId: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        hospitalId,
        userId,
        role: {
          name: 'HOSPITAL_ADMIN',
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Only an authorized hospital administrator can manage staff rosters.',
      );
    }
  }

  private parseSriLankaDateTime(date: string, time: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date must use YYYY-MM-DD format.');
    }

    const value = new Date(`${date}T${time}:00+05:30`);

    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('Invalid duty date or shift time.');
    }

    return value;
  }

  private validateShiftTimes(
    startTime: string,
    endTime: string,
    crossesMidnight: boolean,
  ) {
    const start = this.parseMinutes(startTime);
    const end = this.parseMinutes(endTime);

    if (start === end) {
      throw new BadRequestException(
        'Shift start and end times cannot be identical.',
      );
    }

    if (crossesMidnight && end > start) {
      throw new BadRequestException(
        'A shift marked as overnight must end on the following day.',
      );
    }

    if (!crossesMidnight && end < start) {
      throw new BadRequestException(
        'Select crossesMidnight for a shift that ends the next day.',
      );
    }
  }

  private parseMinutes(value: string): number {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

    if (!match) {
      throw new BadRequestException(
        'Shift times must use HH:mm in 24-hour format.',
      );
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  async createShift(
    hospitalId: string,
    userId: string,
    dto: CreateHospitalShiftDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const crossesMidnight = dto.crossesMidnight ?? false;

    this.validateShiftTimes(dto.startTime, dto.endTime, crossesMidnight);

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          hospitalId,
          status: 'ACTIVE',
        },
      });

      if (!department) {
        throw new BadRequestException(
          'The selected department does not belong to this hospital or is inactive.',
        );
      }
    }

    try {
      return await this.prisma.hospitalShift.create({
        data: {
          hospitalId,
          departmentId: dto.departmentId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description,
          startTime: dto.startTime,
          endTime: dto.endTime,
          crossesMidnight,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A shift with this code already exists in this hospital.',
        );
      }

      throw error;
    }
  }

  async getShifts(hospitalId: string, userId: string, departmentId?: string) {
    await this.verifyHospitalAccess(hospitalId, userId);

    return this.prisma.hospitalShift.findMany({
      where: {
        hospitalId,
        isActive: true,
        ...(departmentId
          ? {
              OR: [{ departmentId }, { departmentId: null }],
            }
          : {}),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { name: 'asc' }],
    });
  }

  async createDuty(
    hospitalId: string,
    userId: string,
    dto: CreateStaffDutyDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const shift = await this.prisma.hospitalShift.findFirst({
      where: {
        id: dto.shiftId,
        hospitalId,
        isActive: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Active shift not found in this hospital.');
    }

    const staff = await this.prisma.hospitalStaffAssignment.findFirst({
      where: {
        id: dto.staffAssignmentId,
        hospitalId,
        startDate: {
          lte: new Date(`${dto.dutyDate}T23:59:59+05:30`),
        },
        OR: [
          { endDate: null },
          {
            endDate: {
              gte: new Date(`${dto.dutyDate}T00:00:00+05:30`),
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    if (!staff || !staff.user.isActive) {
      throw new BadRequestException(
        'The selected employee is not actively assigned to this hospital on the selected date.',
      );
    }

    const departmentId =
      dto.departmentId ?? staff.departmentId ?? shift.departmentId ?? null;

    if (staff.departmentId && departmentId !== staff.departmentId) {
      throw new BadRequestException(
        'The selected department does not match the employee assignment.',
      );
    }

    if (shift.departmentId && departmentId !== shift.departmentId) {
      throw new BadRequestException(
        'The selected department does not match the shift department.',
      );
    }

    if (departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: departmentId,
          hospitalId,
          status: 'ACTIVE',
        },
      });

      if (!department) {
        throw new BadRequestException(
          'The selected department is not active in this hospital.',
        );
      }
    }

    const startsAt = this.parseSriLankaDateTime(dto.dutyDate, shift.startTime);

    let endsAt = this.parseSriLankaDateTime(dto.dutyDate, shift.endTime);

    if (shift.crossesMidnight) {
      endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'The shift end time must be after its start time.',
      );
    }

    // A maximum duration is a safety check against accidental
    // overnight flags or malformed shift definitions.
    const durationHours =
      (endsAt.getTime() - startsAt.getTime()) / (60 * 60 * 1000);

    if (durationHours > 24) {
      throw new BadRequestException('A shift cannot exceed 24 hours.');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const overlapping = await tx.staffDutyAssignment.findFirst({
            where: {
              hospitalId,
              staffAssignmentId: dto.staffAssignmentId,
              status: StaffDutyStatus.SCHEDULED,
              startsAt: {
                lt: endsAt,
              },
              endsAt: {
                gt: startsAt,
              },
            },
          });

          if (overlapping) {
            throw new ConflictException(
              'This employee already has an overlapping scheduled duty.',
            );
          }

          return tx.staffDutyAssignment.create({
            data: {
              hospitalId,
              departmentId,
              staffAssignmentId: dto.staffAssignmentId,
              shiftId: dto.shiftId,
              dutyDate: new Date(`${dto.dutyDate}T00:00:00.000Z`),
              startsAt,
              endsAt,
              notes: dto.notes,
              assignedById: userId,
            },
            include: {
              shift: true,
              department: true,
              staffAssignment: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Another roster update happened simultaneously. Reload and try again.',
        );
      }

      throw error;
    }
  }

  async getDuties(
    hospitalId: string,
    userId: string,
    query: QueryStaffDutiesDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const from = new Date(`${query.fromDate}T00:00:00.000Z`);

    const to = new Date(`${query.toDate}T23:59:59.999Z`);

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException('Invalid roster date range.');
    }

    const differenceDays =
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);

    if (differenceDays > 31) {
      throw new BadRequestException('A roster query cannot exceed 31 days.');
    }

    return this.prisma.staffDutyAssignment.findMany({
      where: {
        hospitalId,
        dutyDate: {
          gte: from,
          lte: to,
        },
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.staffAssignmentId
          ? { staffAssignmentId: query.staffAssignmentId }
          : {}),
      },
      include: {
        shift: true,
        department: true,
        staffAssignment: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ dutyDate: 'asc' }, { startsAt: 'asc' }],
    });
  }

  async cancelDuty(
    hospitalId: string,
    userId: string,
    dutyId: string,
    reason: string,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const duty = await this.prisma.staffDutyAssignment.findFirst({
      where: {
        id: dutyId,
        hospitalId,
      },
    });

    if (!duty) {
      throw new NotFoundException('Duty assignment not found.');
    }

    if (duty.status !== StaffDutyStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled duties can be cancelled.');
    }

    const result = await this.prisma.staffDutyAssignment.updateMany({
      where: {
        id: dutyId,
        hospitalId,
        status: StaffDutyStatus.SCHEDULED,
      },
      data: {
        status: StaffDutyStatus.CANCELLED,
        cancelledById: userId,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'The duty was changed by another user. Reload and try again.',
      );
    }

    return {
      message: 'Duty assignment cancelled successfully.',
      dutyId,
    };
  }
}
