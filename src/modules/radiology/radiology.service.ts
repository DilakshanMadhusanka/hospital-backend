import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import {
  Prisma,
  RadiologyAppointmentStatus,
  RadiologyRequestStatus,
  ImagingEquipmentStatus,
  RadiologyPriority,
} from '@prisma/client';

import { CreateRadiologyAppointmentDto } from './dto/create-radiology-appointment.dto.js';
import { QueryRadiologyAppointmentsDto } from './dto/query-radiology-appointments.dto.js';

import { randomUUID } from 'crypto';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto.js';
import { QueryRadiologyRequestsDto } from './dto/query-radiology-requests.dto.js';

@Injectable()
export class RadiologyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify that the logged-in user has an assignment
   * to the requested hospital.
   */
  private async verifyHospitalAccess(userId: string, hospitalId: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this hospital.');
    }
  }

  /**
   * Generate a human-readable hospital request number.
   */
  private generateRequestNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const randomPart = randomUUID()
      .replace(/-/g, '')
      .substring(0, 8)
      .toUpperCase();

    return `RAD-${year}-${randomPart}`;
  }

  /**
   * Create a radiology request.
   */
  async createRequest(
    hospitalId: string,
    userId: string,
    dto: CreateRadiologyRequestDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const hasOpdVisit = !!dto.opdVisitId;
    const hasIpdAdmission = !!dto.ipdAdmissionId;

    if (hasOpdVisit === hasIpdAdmission) {
      throw new BadRequestException(
        'Provide exactly one of opdVisitId or ipdAdmissionId.',
      );
    }

    // Verify the patient belongs to this hospital.
    const registration = await this.prisma.hospitalPatient.findFirst({
      where: {
        hospitalId,
        patientId: dto.patientId,
        status: 'ACTIVE',
      },
    });

    if (!registration) {
      throw new BadRequestException(
        'The patient is not actively registered at this hospital.',
      );
    }

    // Verify department.
    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        hospitalId,
        status: 'ACTIVE',
      },
    });

    if (!department) {
      throw new BadRequestException(
        'Invalid or inactive department for this hospital.',
      );
    }

    // Verify imaging procedure.
    const procedure = await this.prisma.radiologyProcedure.findFirst({
      where: {
        id: dto.procedureId,
        hospitalId,
        status: 'ACTIVE',
      },
    });

    if (!procedure) {
      throw new BadRequestException('Invalid or inactive radiology procedure.');
    }

    // Verify the source clinical encounter.
    if (dto.opdVisitId) {
      const visit = await this.prisma.oPDVisit.findFirst({
        where: {
          id: dto.opdVisitId,
          hospitalId,
          patientId: dto.patientId,
        },
      });

      if (!visit) {
        throw new BadRequestException(
          'The OPD visit does not belong to this patient and hospital.',
        );
      }
    }

    if (dto.ipdAdmissionId) {
      const admission = await this.prisma.iPDAdmission.findFirst({
        where: {
          id: dto.ipdAdmissionId,
          hospitalId,
          patientId: dto.patientId,
        },
      });

      if (!admission) {
        throw new BadRequestException(
          'The IPD admission does not belong to this patient and hospital.',
        );
      }
    }

    // Verify requesting user exists.
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!requestingUser) {
      throw new NotFoundException('Requesting user not found.');
    }

    return this.prisma.radiologyRequest.create({
      data: {
        requestNumber: this.generateRequestNumber(),
        hospitalId,
        departmentId: dto.departmentId,
        patientId: dto.patientId,
        procedureId: dto.procedureId,
        opdVisitId: dto.opdVisitId,
        ipdAdmissionId: dto.ipdAdmissionId,
        requestedById: userId,
        clinicalIndication: dto.clinicalIndication,
        priority: dto.priority ?? RadiologyPriority.ROUTINE,
        notes: dto.notes,
      },
      include: {
        patient: true,
        procedure: true,
        department: true,
        requestedBy: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  /**
   * Get requests belonging to one hospital.
   */
  async getRequests(
    hospitalId: string,
    userId: string,
    filters: QueryRadiologyRequestsDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.prisma.radiologyRequest.findMany({
      where: {
        hospitalId,
        ...(filters.status && { status: filters.status }),
        ...(filters.patientId && { patientId: filters.patientId }),
        ...(filters.departmentId && {
          departmentId: filters.departmentId,
        }),
      },
      include: {
        patient: true,
        procedure: true,
        department: true,
        requestedBy: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
    });
  }

  /**
   * Get one request.
   */
  async getRequestById(hospitalId: string, userId: string, requestId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const request = await this.prisma.radiologyRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
      include: {
        patient: true,
        procedure: true,
        department: true,
        requestedBy: {
          select: {
            id: true,
          },
        },
        opdVisit: true,
        ipdAdmission: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Radiology request not found.');
    }

    return request;
  }

  /**
   * Change request status using an allowed transition.
   */
  async updateRequestStatus(
    hospitalId: string,
    userId: string,
    requestId: string,
    newStatus: RadiologyRequestStatus,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const request = await this.prisma.radiologyRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
    });

    if (!request) {
      throw new NotFoundException('Radiology request not found.');
    }

    const allowedTransitions: Record<
      RadiologyRequestStatus,
      RadiologyRequestStatus[]
    > = {
      REQUESTED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[request.status].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change request status from ${request.status} to ${newStatus}.`,
      );
    }

    return this.prisma.radiologyRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
      include: {
        patient: true,
        procedure: true,
        department: true,
      },
    });
  }

  async createAppointment(
    hospitalId: string,
    userId: string,
    dto: CreateRadiologyAppointmentDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      throw new BadRequestException(
        'The appointment end time must be later than the start time.',
      );
    }

    // Keep appointments within a reasonable maximum duration.
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    if (durationMinutes > 24 * 60) {
      throw new BadRequestException('An appointment cannot exceed 24 hours.');
    }

    // Retry serialization conflicts caused by simultaneous bookings.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const request = await tx.radiologyRequest.findFirst({
              where: {
                id: dto.requestId,
                hospitalId,
              },
              include: {
                procedure: true,
              },
            });

            if (!request) {
              throw new NotFoundException('Radiology request not found.');
            }

            if (
              request.status !== RadiologyRequestStatus.ACCEPTED &&
              request.status !== RadiologyRequestStatus.SCHEDULED
            ) {
              throw new BadRequestException(
                'Only accepted or previously scheduled requests can be scheduled.',
              );
            }

            const equipment = await tx.imagingEquipment.findFirst({
              where: {
                id: dto.equipmentId,
                hospitalId,
              },
            });

            if (!equipment) {
              throw new NotFoundException(
                'Imaging equipment not found in this hospital.',
              );
            }

            if (equipment.status !== ImagingEquipmentStatus.OPERATIONAL) {
              throw new BadRequestException(
                'The selected equipment is not operational.',
              );
            }

            if (equipment.modality !== request.procedure.modality) {
              throw new BadRequestException(
                'The equipment modality does not match the requested procedure.',
              );
            }

            // Ensure there is no other active appointment for this request.
            const existingRequestAppointment =
              await tx.radiologyAppointment.findFirst({
                where: {
                  requestId: request.id,
                  status: {
                    in: [
                      RadiologyAppointmentStatus.SCHEDULED,
                      RadiologyAppointmentStatus.CONFIRMED,
                      RadiologyAppointmentStatus.ARRIVED,
                      RadiologyAppointmentStatus.IN_PROGRESS,
                    ],
                  },
                },
              });

            if (existingRequestAppointment) {
              throw new ConflictException(
                'This radiology request already has an active appointment.',
              );
            }

            // Detect overlapping appointments for the selected equipment.
            const conflictingAppointment =
              await tx.radiologyAppointment.findFirst({
                where: {
                  hospitalId,
                  equipmentId: equipment.id,
                  status: {
                    in: [
                      RadiologyAppointmentStatus.SCHEDULED,
                      RadiologyAppointmentStatus.CONFIRMED,
                      RadiologyAppointmentStatus.ARRIVED,
                      RadiologyAppointmentStatus.IN_PROGRESS,
                    ],
                  },
                  scheduledStart: {
                    lt: end,
                  },
                  scheduledEnd: {
                    gt: start,
                  },
                },
              });

            if (conflictingAppointment) {
              throw new ConflictException(
                'The selected equipment already has an appointment during this time.',
              );
            }

            const appointment = await tx.radiologyAppointment.create({
              data: {
                hospitalId,
                requestId: request.id,
                equipmentId: equipment.id,
                createdById: userId,
                scheduledStart: start,
                scheduledEnd: end,
                notes: dto.notes,
                status: RadiologyAppointmentStatus.SCHEDULED,
              },
              include: {
                request: {
                  include: {
                    patient: true,
                    procedure: true,
                  },
                },
                equipment: true,
                createdBy: {
                  select: {
                    id: true,
                  },
                },
              },
            });

            await tx.radiologyRequest.update({
              where: {
                id: request.id,
              },
              data: {
                status: RadiologyRequestStatus.SCHEDULED,
              },
            });

            return appointment;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        const prismaError = error as { code?: string };

        if (prismaError.code === 'P2034' && attempt < 3) {
          continue;
        }

        if (prismaError.code === 'P2034') {
          throw new ServiceUnavailableException(
            'The schedule is being updated by another user. Please try again.',
          );
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      'Unable to create the appointment. Please try again.',
    );
  }

  async getAppointments(
    hospitalId: string,
    userId: string,
    filters: QueryRadiologyAppointmentsDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    if (
      filters.from &&
      filters.to &&
      new Date(filters.to) < new Date(filters.from)
    ) {
      throw new BadRequestException(
        'The end date cannot be earlier than the start date.',
      );
    }

    return this.prisma.radiologyAppointment.findMany({
      where: {
        hospitalId,

        ...(filters.status && {
          status: filters.status,
        }),

        ...(filters.equipmentId && {
          equipmentId: filters.equipmentId,
        }),

        ...(filters.requestId && {
          requestId: filters.requestId,
        }),

        ...(filters.from || filters.to
          ? {
              scheduledStart: {
                ...(filters.from && {
                  gte: new Date(filters.from),
                }),
                ...(filters.to && {
                  lte: new Date(filters.to),
                }),
              },
            }
          : {}),
      },

      include: {
        request: {
          include: {
            patient: true,
            procedure: true,
          },
        },
        equipment: true,
        createdBy: {
          select: {
            id: true,
          },
        },
      },

      orderBy: {
        scheduledStart: 'asc',
      },
    });
  }

  async getAppointmentById(
    hospitalId: string,
    userId: string,
    appointmentId: string,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const appointment = await this.prisma.radiologyAppointment.findFirst({
      where: {
        id: appointmentId,
        hospitalId,
      },
      include: {
        request: {
          include: {
            patient: true,
            procedure: true,
          },
        },
        equipment: true,
        createdBy: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Radiology appointment not found.');
    }

    return appointment;
  }

  async updateAppointmentStatus(
    hospitalId: string,
    userId: string,
    appointmentId: string,
    newStatus: RadiologyAppointmentStatus,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const allowedTransitions: Record<
      RadiologyAppointmentStatus,
      RadiologyAppointmentStatus[]
    > = {
      SCHEDULED: [
        RadiologyAppointmentStatus.CONFIRMED,
        RadiologyAppointmentStatus.ARRIVED,
        RadiologyAppointmentStatus.CANCELLED,
      ],

      CONFIRMED: [
        RadiologyAppointmentStatus.ARRIVED,
        RadiologyAppointmentStatus.CANCELLED,
      ],

      ARRIVED: [
        RadiologyAppointmentStatus.IN_PROGRESS,
        RadiologyAppointmentStatus.CANCELLED,
      ],

      IN_PROGRESS: [RadiologyAppointmentStatus.COMPLETED],

      COMPLETED: [],

      CANCELLED: [],

      NO_SHOW: [],
    };

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.radiologyAppointment.findFirst({
        where: {
          id: appointmentId,
          hospitalId,
        },
      });

      if (!appointment) {
        throw new NotFoundException('Radiology appointment not found.');
      }

      if (!allowedTransitions[appointment.status].includes(newStatus)) {
        throw new BadRequestException(
          `Cannot change appointment from ${appointment.status} to ${newStatus}.`,
        );
      }

      const now = new Date();

      const updateData: Prisma.RadiologyAppointmentUpdateInput = {
        status: newStatus,
      };

      if (newStatus === RadiologyAppointmentStatus.ARRIVED) {
        updateData.arrivedAt = now;
      }

      if (newStatus === RadiologyAppointmentStatus.IN_PROGRESS) {
        updateData.startedAt = now;
      }

      if (newStatus === RadiologyAppointmentStatus.COMPLETED) {
        updateData.completedAt = now;
      }

      // Conditional update protects against simultaneous status changes.
      const updated = await tx.radiologyAppointment.updateMany({
        where: {
          id: appointmentId,
          hospitalId,
          status: appointment.status,
        },
        data: updateData,
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'The appointment was modified by another user. Refresh and try again.',
        );
      }

      if (newStatus === RadiologyAppointmentStatus.COMPLETED) {
        await tx.radiologyRequest.updateMany({
          where: {
            id: appointment.requestId,
            hospitalId,
            status: RadiologyRequestStatus.SCHEDULED,
          },
          data: {
            status: RadiologyRequestStatus.COMPLETED,
          },
        });
      }

      return tx.radiologyAppointment.findFirst({
        where: {
          id: appointmentId,
          hospitalId,
        },
        include: {
          request: {
            include: {
              patient: true,
              procedure: true,
            },
          },
          equipment: true,
        },
      });
    });
  }
}
