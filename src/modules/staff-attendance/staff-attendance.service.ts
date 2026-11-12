import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

import { CheckInDto } from './dto/check-in.dto.js';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';

@Injectable()
export class StaffAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAdmin(
    userId: string,
    hospitalId: string,
  ): Promise<void> {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
        role: {
          name: 'HOSPITAL_ADMIN',
        },
      },
    });

    if (!role) {
      throw new ForbiddenException(
        'Only hospital administrators can perform this operation.',
      );
    }
  }

  private getSriLankaDateBounds(date: string) {
    const start = new Date(`${date}T00:00:00.000+05:30`);
    const end = new Date(`${date}T23:59:59.999+05:30`);

    return { start, end };
  }

  private calculateMinutesWorked(checkInAt: Date, checkOutAt: Date): number {
    const difference = checkOutAt.getTime() - checkInAt.getTime();

    return Math.floor(difference / 60000);
  }

  /**
   * Staff member checks in for an assigned duty.
   */
  async checkIn(hospitalId: string, userId: string, dto: CheckInDto) {
    const duty = await this.prisma.staffDutyAssignment.findFirst({
      where: {
        id: dto.dutyAssignmentId,
        hospitalId,
        status: 'SCHEDULED',
        staffAssignment: {
          hospitalId,
          userId,
          status: 'ACTIVE',
        },
      },
      include: {
        shift: true,
        staffAssignment: true,
      },
    });

    if (!duty) {
      throw new NotFoundException(
        'An active duty assignment for this staff member was not found.',
      );
    }

    const now = new Date();

    if (now > duty.endsAt) {
      throw new BadRequestException(
        'This duty has already ended. Contact the hospital administrator.',
      );
    }

    const existing = await this.prisma.staffAttendance.findUnique({
      where: {
        dutyAssignmentId: duty.id,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Attendance has already been recorded for this duty.',
      );
    }

    const gracePeriod = duty.shift.lateGraceMinutes ?? 5;

    const lateThreshold = duty.startsAt.getTime() + gracePeriod * 60 * 1000;

    const minutesLate =
      now.getTime() > lateThreshold
        ? Math.floor((now.getTime() - lateThreshold) / 60000) + 1
        : 0;

    const status = minutesLate > 0 ? 'LATE' : 'PRESENT';

    try {
      return await this.prisma.staffAttendance.create({
        data: {
          hospitalId,
          dutyAssignmentId: duty.id,
          status,
          checkInAt: now,
          minutesLate,
          notes: dto.notes,
          recordedById: userId,
        },
        include: {
          dutyAssignment: {
            include: {
              shift: true,
              department: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Attendance has already been recorded for this duty.',
        );
      }

      throw error;
    }
  }

  /**
   * Staff member checks out from an active attendance record.
   */
  async checkOut(hospitalId: string, userId: string, attendanceId: string) {
    const attendance = await this.prisma.staffAttendance.findFirst({
      where: {
        id: attendanceId,
        hospitalId,
        recordedById: userId,
      },
      include: {
        dutyAssignment: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found.');
    }

    if (!attendance.checkInAt) {
      throw new ConflictException(
        'A check-in time has not been recorded for this duty.',
      );
    }

    if (attendance.checkOutAt) {
      throw new ConflictException(
        'You have already checked out for this duty.',
      );
    }

    const now = new Date();

    if (now <= attendance.checkInAt) {
      throw new BadRequestException('Check-out must be later than check-in.');
    }

    return this.prisma.staffAttendance.update({
      where: { id: attendance.id },
      data: {
        checkOutAt: now,
        minutesWorked: this.calculateMinutesWorked(attendance.checkInAt, now),
      },
    });
  }

  /**
   * Hospital administrator corrects an attendance record.
   */
  async correctAttendance(
    hospitalId: string,
    userId: string,
    attendanceId: string,
    dto: CorrectAttendanceDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const attendance = await this.prisma.staffAttendance.findFirst({
      where: {
        id: attendanceId,
        hospitalId,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found.');
    }

    const checkInAt = dto.checkInAt
      ? new Date(dto.checkInAt)
      : attendance.checkInAt;

    const checkOutAt = dto.checkOutAt
      ? new Date(dto.checkOutAt)
      : attendance.checkOutAt;

    if (!checkInAt) {
      throw new BadRequestException(
        'A check-in time is required to correct this attendance record.',
      );
    }

    if (checkOutAt && checkOutAt <= checkInAt) {
      throw new BadRequestException('Check-out must be later than check-in.');
    }

    const minutesWorked = checkOutAt
      ? this.calculateMinutesWorked(checkInAt, checkOutAt)
      : null;

    return this.prisma.staffAttendance.update({
      where: { id: attendance.id },
      data: {
        checkInAt,
        checkOutAt,
        minutesWorked,
        correctionReason: dto.reason,
        modifiedById: userId,
      },
    });
  }

  /**
   * Mark a duty as absent if no attendance was recorded.
   */
  async markAbsent(
    hospitalId: string,
    userId: string,
    dutyAssignmentId: string,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const duty = await this.prisma.staffDutyAssignment.findFirst({
      where: {
        id: dutyAssignmentId,
        hospitalId,
        status: 'SCHEDULED',
      },
    });

    if (!duty) {
      throw new NotFoundException('Scheduled duty not found.');
    }

    if (new Date() <= duty.endsAt) {
      throw new BadRequestException(
        'A duty can only be marked absent after its scheduled end time.',
      );
    }

    try {
      return await this.prisma.staffAttendance.create({
        data: {
          hospitalId,
          dutyAssignmentId,
          status: 'ABSENT',
          checkInAt: null,
          minutesLate: 0,
          recordedById: userId,
          correctionReason: 'Marked absent by hospital administrator.',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Attendance already exists for this duty.');
      }

      throw error;
    }
  }

  /**
   * View attendance records for a date range.
   */
  async getAttendance(hospitalId: string, query: QueryAttendanceDto) {
    const from = new Date(`${query.fromDate}T00:00:00.000Z`);
    const to = new Date(`${query.toDate}T23:59:59.999Z`);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException('Invalid date range.');
    }

    const maximumRange = 31 * 24 * 60 * 60 * 1000;

    if (to.getTime() - from.getTime() > maximumRange) {
      throw new BadRequestException(
        'The maximum attendance report range is 31 days.',
      );
    }

    return this.prisma.staffAttendance.findMany({
      where: {
        hospitalId,
        dutyAssignment: {
          dutyDate: {
            gte: from,
            lte: to,
          },
          ...(query.departmentId ? { departmentId: query.departmentId } : {}),
          ...(query.staffAssignmentId
            ? { staffAssignmentId: query.staffAssignmentId }
            : {}),
        },
      },
      include: {
        dutyAssignment: {
          include: {
            shift: true,
            department: true,
            staffAssignment: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkInAt: 'desc',
      },
      take: 500,
    });
  }

  /**
   * Daily attendance summary.
   */
  async getDailySummary(hospitalId: string, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const records = await this.prisma.staffAttendance.findMany({
      where: {
        hospitalId,
        dutyAssignment: {
          dutyDate: {
            gte: start,
            lte: end,
          },
        },
      },
      select: {
        status: true,
        minutesLate: true,
        minutesWorked: true,
      },
    });
  }
}
