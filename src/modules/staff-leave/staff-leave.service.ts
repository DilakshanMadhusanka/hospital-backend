import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto.js';

@Injectable()
export class StaffLeaveService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAdmin(
    userId: string,
    hospitalId: string,
  ) {
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

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        'Dates must use YYYY-MM-DD format.',
      );
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid calendar date.');
    }

    return date;
  }

  private calculateCalendarDays(
    startDate: Date,
    endDate: Date,
  ): number {
    // Prototype only: includes weekends and public holidays. Production leave
    // entitlements should use a hospital working calendar and configurable policies.
    const difference =
      endDate.getTime() - startDate.getTime();

    return Math.floor(difference / 86400000) + 1;
  }

  private async verifyStaffAssignment(
    hospitalId: string,
    staffAssignmentId: string,
    userId?: string,
  ) {
    const assignment =
      await this.prisma.hospitalStaffAssignment.findFirst({
        where: {
          id: staffAssignmentId,
          hospitalId,
          ...(userId ? { userId } : {}),
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Staff assignment was not found for this hospital.',
      );
    }

    return assignment;
  }

  // --------------------------------------------------
  // 1. Create a leave type
  // --------------------------------------------------

  async createLeaveType(
    hospitalId: string,
    userId: string,
    dto: CreateLeaveTypeDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    try {
      return await this.prisma.staffLeaveType.create({
        data: {
          hospitalId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          category: dto.category,
          description: dto.description,
          isPaid: dto.isPaid ?? true,
          requiresApproval: dto.requiresApproval ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A leave type with this code already exists.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 2. List leave types
  // --------------------------------------------------

  async getLeaveTypes(hospitalId: string) {
    return this.prisma.staffLeaveType.findMany({
      where: {
        hospitalId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // --------------------------------------------------
  // 3. Configure staff leave entitlement
  // --------------------------------------------------

  async setLeaveBalance(
    hospitalId: string,
    userId: string,
    dto: SetLeaveBalanceDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    await this.verifyStaffAssignment(
      hospitalId,
      dto.staffAssignmentId,
    );

    const leaveType =
      await this.prisma.staffLeaveType.findFirst({
        where: {
          id: dto.leaveTypeId,
          hospitalId,
          isActive: true,
        },
      });

    if (!leaveType) {
      throw new NotFoundException('Active leave type not found.');
    }

    const entitlement = new Prisma.Decimal(
      dto.entitledDays,
    );

    const existing =
      await this.prisma.staffLeaveBalance.findUnique({
        where: {
          staffAssignmentId_leaveTypeId_year: {
            staffAssignmentId: dto.staffAssignmentId,
            leaveTypeId: dto.leaveTypeId,
            year: dto.year,
          },
        },
      });

    if (existing) {
      if (existing.usedDays.greaterThan(entitlement)) {
        throw new BadRequestException(
          'New entitlement cannot be lower than leave already used.',
        );
      }

      return this.prisma.staffLeaveBalance.update({
        where: {
          id: existing.id,
        },
        data: {
          entitledDays: entitlement,
          availableDays: entitlement.minus(existing.usedDays),
        },
      });
    }

    return this.prisma.staffLeaveBalance.create({
      data: {
        hospitalId,
        staffAssignmentId: dto.staffAssignmentId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        entitledDays: entitlement,
        usedDays: new Prisma.Decimal(0),
        availableDays: entitlement,
      },
    });
  }

  // --------------------------------------------------
  // 4. Staff member applies for leave
  // --------------------------------------------------

  async applyForLeave(
    hospitalId: string,
    userId: string,
    dto: CreateLeaveApplicationDto,
  ) {
    const assignment = await this.verifyStaffAssignment(
      hospitalId,
      this.getAssignmentIdFromUserContext(userId),
      userId,
    ).catch(() => null);

    // Staff assignment lookup is performed below through
    // the actual staff assignment associated with the user.
    const staffAssignments =
      await this.prisma.hospitalStaffAssignment.findMany({
        where: {
          hospitalId,
          userId,
        },
        take: 2,
      });

    if (staffAssignments.length === 0) {
      throw new NotFoundException(
        'No staff assignment was found for this user.',
      );
    }

    if (staffAssignments.length > 1) {
      throw new BadRequestException(
        'This user has multiple staff assignments. Select an assignment explicitly.',
      );
    }

    const staffAssignment = staffAssignments[0];

    const leaveType =
      await this.prisma.staffLeaveType.findFirst({
        where: {
          id: dto.leaveTypeId,
          hospitalId,
          isActive: true,
        },
      });

    if (!leaveType) {
      throw new NotFoundException('Active leave type not found.');
    }

    const startDate = this.parseDate(dto.startDate);
    const endDate = this.parseDate(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'Leave end date cannot be before the start date.',
      );
    }

    if (
      startDate.getUTCFullYear() !==
      endDate.getUTCFullYear()
    ) {
      throw new BadRequestException(
        'A leave application cannot cross calendar years. Submit separate applications for each year.',
      );
    }

    const days = this.calculateCalendarDays(
      startDate,
      endDate,
    );

    if (days > 60) {
      throw new BadRequestException(
        'A single leave application cannot exceed 60 calendar days.',
      );
    }

    const overlap =
      await this.prisma.staffLeaveApplication.findFirst({
        where: {
          hospitalId,
          staffAssignmentId: staffAssignment.id,
          status: {
            in: ['PENDING', 'APPROVED'],
          },
          startDate: {
            lte: endDate,
          },
          endDate: {
            gte: startDate,
          },
        },
      });

    if (overlap) {
      throw new ConflictException(
        'You already have a pending or approved leave application overlapping these dates.',
      );
    }

    if (leaveType.isPaid) {
      const balance =
        await this.prisma.staffLeaveBalance.findUnique({
          where: {
            staffAssignmentId_leaveTypeId_year: {
              staffAssignmentId: staffAssignment.id,
              leaveTypeId: leaveType.id,
              year: startDate.getUTCFullYear(),
            },
          },
        });

      if (!balance) {
        throw new BadRequestException(
          'No leave balance has been configured for this leave type and year.',
        );
      }

      if (
        balance.availableDays.lessThan(
          new Prisma.Decimal(days),
        )
      ) {
        throw new BadRequestException(
          'Insufficient leave balance.',
        );
      }
    }

    return this.prisma.staffLeaveApplication.create({
      data: {
        hospitalId,
        staffAssignmentId: staffAssignment.id,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        numberOfDays: new Prisma.Decimal(days),
        reason: dto.reason,
        attachmentKey: dto.attachmentKey,
        applicantId: userId,
        status: 'PENDING',
      },
      include: {
        leaveType: true,
        staffAssignment: true,
      },
    });
  }

  // --------------------------------------------------
  // 5. Review an application
  // --------------------------------------------------

  async reviewApplication(
    hospitalId: string,
    userId: string,
    applicationId: string,
    dto: ReviewLeaveDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const application =
            await tx.staffLeaveApplication.findFirst({
              where: {
                id: applicationId,
                hospitalId,
              },
              include: {
                leaveType: true,
              },
            });

          if (!application) {
            throw new NotFoundException(
              'Leave application not found.',
            );
          }

          if (application.status !== 'PENDING') {
            throw new ConflictException(
              'Only pending applications can be reviewed.',
            );
          }

          if (dto.decision === 'REJECTED') {
            await tx.staffLeaveApplication.update({
              where: {
                id: application.id,
              },
              data: {
                status: 'REJECTED',
                reviewedById: userId,
                reviewedAt: new Date(),
                reviewComment: dto.comment,
              },
            });

            return tx.staffLeaveApplication.findUnique({
              where: { id: application.id },
              include: {
                leaveType: true,
                staffAssignment: true,
              },
            });
          }

          // Check whether the staff member has scheduled
          // duties during the requested leave.
          const dutyConflict =
            await tx.staffDutyAssignment.findFirst({
              where: {
                hospitalId,
                staffAssignmentId:
                  application.staffAssignmentId,
                status: 'SCHEDULED',
                dutyDate: {
                  gte: application.startDate,
                  lte: application.endDate,
                },
              },
            });

          if (dutyConflict) {
            throw new ConflictException(
              'This staff member has scheduled duties during the requested leave. Reassign or cancel those duties before approving.',
            );
          }

          // Deduct balance only for paid leave.
          if (application.leaveType.isPaid) {
            const year =
              application.startDate.getUTCFullYear();

            const deduction =
              await tx.staffLeaveBalance.updateMany({
                where: {
                  staffAssignmentId:
                    application.staffAssignmentId,
                  leaveTypeId: application.leaveTypeId,
                  year,
                  availableDays: {
                    gte: application.numberOfDays,
                  },
                },
                data: {
                  availableDays: {
                    decrement: application.numberOfDays,
                  },
                  usedDays: {
                    increment: application.numberOfDays,
                  },
                },
              });

            if (deduction.count !== 1) {
              throw new ConflictException(
                'Insufficient or unavailable leave balance.',
              );
            }
          }

          const updated =
            await tx.staffLeaveApplication.updateMany({
              where: {
                id: application.id,
                status: 'PENDING',
              },
              data: {
                status: 'APPROVED',
                reviewedById: userId,
                reviewedAt: new Date(),
                reviewComment: dto.comment,
              },
            });

          if (updated.count !== 1) {
            throw new ConflictException(
              'This application has already been reviewed.',
            );
          }

          return tx.staffLeaveApplication.findUnique({
            where: {
              id: application.id,
            },
            include: {
              leaveType: true,
              staffAssignment: true,
            },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'The leave application changed during processing. Please retry.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 6. View applications
  // --------------------------------------------------

  async getApplications(
    hospitalId: string,
    status?: string,
  ) {
    return this.prisma.staffLeaveApplication.findMany({
      where: {
        hospitalId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        leaveType: true,
        staffAssignment: {
          include: {
            user: true,
          },
        },
        applicant: true,
        reviewer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });
  }

  // --------------------------------------------------
  // 7. View own leave applications
  // --------------------------------------------------

  async getMyApplications(
    hospitalId: string,
    userId: string,
  ) {
    return this.prisma.staffLeaveApplication.findMany({
      where: {
        hospitalId,
        applicantId: userId,
      },
      include: {
        leaveType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // --------------------------------------------------
  // 8. View leave balances
  // --------------------------------------------------

  async getMyBalances(
    hospitalId: string,
    userId: string,
    year: number,
  ) {
    const assignments =
      await this.prisma.hospitalStaffAssignment.findMany({
        where: {
          hospitalId,
          userId,
        },
        select: {
          id: true,
        },
      });

    const assignmentIds = assignments.map(
      (assignment) => assignment.id,
    );

    return this.prisma.staffLeaveBalance.findMany({
      where: {
        hospitalId,
        staffAssignmentId: {
          in: assignmentIds,
        },
        year,
      },
      include: {
        leaveType: true,
      },
    });
  }

  private getAssignmentIdFromUserContext(
    _userId: string,
  ): string {
    // The staff assignment is resolved from the database
    // in applyForLeave(). This method is intentionally
    // not used to create an assignment ID.
    return '';
  }
}