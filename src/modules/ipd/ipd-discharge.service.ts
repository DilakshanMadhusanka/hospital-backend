import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateIPDDischargeRequestDto } from './dto/create-ipd-discharge-request.dto.js';
import { RejectIPDDischargeDto } from './dto/reject-ipd-discharge.dto.js';
import { CreateIPDDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto.js';

import { BedStatus, IPDDischargeStatus, Prisma } from '@prisma/client';

import { CompleteIPDDischargeDto } from './dto/complete-ipd-discharge.dto.js';

@Injectable()
export class IpdDischargeService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createRequest(
    hospitalId: string,
    userId: string,
    dto: CreateIPDDischargeRequestDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const admission = await this.prisma.iPDAdmission.findFirst({
      where: {
        id: dto.admissionId,
        hospitalId,
        status: 'ADMITTED',
      },
    });

    if (!admission) {
      throw new NotFoundException('Active inpatient admission not found.');
    }

    const activeRequest = await this.prisma.iPDDischargeRequest.findFirst({
      where: {
        admissionId: admission.id,
        hospitalId,
        status: {
          in: [IPDDischargeStatus.REQUESTED, IPDDischargeStatus.APPROVED],
        },
      },
    });

    if (activeRequest) {
      throw new ConflictException(
        'An active discharge request already exists for this admission.',
      );
    }

    return this.prisma.iPDDischargeRequest.create({
      data: {
        admissionId: admission.id,
        hospitalId,
        reason: dto.reason,
        clinicalNotes: dto.clinicalNotes,
        requestedById: userId,
        status: IPDDischargeStatus.REQUESTED,
      },
    });
  }

  async getRequests(
    hospitalId: string,
    userId: string,
    status?: IPDDischargeStatus,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.prisma.iPDDischargeRequest.findMany({
      where: {
        hospitalId,
        ...(status ? { status } : {}),
      },
      include: {
        admission: {
          include: {
            patient: true,
            department: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        summary: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async getRequestById(requestId: string, hospitalId: string, userId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const request = await this.prisma.iPDDischargeRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
      include: {
        admission: {
          include: {
            patient: true,
            department: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        summary: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Discharge request not found.');
    }

    return request;
  }

  async approveRequest(requestId: string, hospitalId: string, userId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const request = await this.prisma.iPDDischargeRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
    });

    if (!request) {
      throw new NotFoundException('Discharge request not found.');
    }

    if (request.status !== IPDDischargeStatus.REQUESTED) {
      throw new ConflictException('Only requested discharges can be approved.');
    }

    const admission = await this.prisma.iPDAdmission.findFirst({
      where: {
        id: request.admissionId,
        hospitalId,
        status: 'ADMITTED',
      },
    });

    if (!admission) {
      throw new ConflictException(
        'The inpatient admission is no longer active.',
      );
    }

    const activeAllocation = await this.prisma.iPDBedAllocation.findFirst({
      where: {
        admissionId: request.admissionId,
        releasedAt: null,
      },
    });

    if (!activeAllocation) {
      throw new ConflictException(
        'No active bed allocation exists for this admission.',
      );
    }

    return this.prisma.iPDDischargeRequest
      .updateMany({
        where: {
          id: requestId,
          hospitalId,
          status: IPDDischargeStatus.REQUESTED,
        },
        data: {
          status: IPDDischargeStatus.APPROVED,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      })
      .then(async (result) => {
        if (result.count !== 1) {
          throw new ConflictException(
            'The discharge request was changed by another user.',
          );
        }

        return this.getRequestById(requestId, hospitalId, userId);
      });
  }

  async rejectRequest(
    requestId: string,
    hospitalId: string,
    userId: string,
    dto: RejectIPDDischargeDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const result = await this.prisma.iPDDischargeRequest.updateMany({
      where: {
        id: requestId,
        hospitalId,
        status: IPDDischargeStatus.REQUESTED,
      },
      data: {
        status: IPDDischargeStatus.REJECTED,
        reviewedById: userId,
        reviewedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'The request does not exist or is no longer awaiting review.',
      );
    }

    return this.getRequestById(requestId, hospitalId, userId);
  }

  async cancelRequest(requestId: string, hospitalId: string, userId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const result = await this.prisma.iPDDischargeRequest.updateMany({
      where: {
        id: requestId,
        hospitalId,
        status: {
          in: [IPDDischargeStatus.REQUESTED, IPDDischargeStatus.APPROVED],
        },
      },
      data: {
        status: IPDDischargeStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'The request does not exist or cannot be cancelled.',
      );
    }

    return this.getRequestById(requestId, hospitalId, userId);
  }

  async createSummary(
    requestId: string,
    hospitalId: string,
    userId: string,
    dto: CreateIPDDischargeSummaryDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const request = await this.prisma.iPDDischargeRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
    });

    if (!request) {
      throw new NotFoundException('Discharge request not found.');
    }

    if (request.status !== IPDDischargeStatus.APPROVED) {
      throw new BadRequestException(
        'A discharge summary can only be prepared for an approved request.',
      );
    }

    const existingSummary = await this.prisma.iPDDischargeSummary.findUnique({
      where: {
        dischargeRequestId: requestId,
      },
    });

    if (existingSummary) {
      throw new ConflictException(
        'A discharge summary already exists for this request.',
      );
    }

    const followUpDate = dto.followUpDate
      ? new Date(dto.followUpDate)
      : undefined;

    if (followUpDate && Number.isNaN(followUpDate.getTime())) {
      throw new BadRequestException('Invalid follow-up date.');
    }

    return this.prisma.iPDDischargeSummary.create({
      data: {
        dischargeRequestId: requestId,
        hospitalId,
        finalDiagnosis: dto.finalDiagnosis,
        secondaryDiagnoses: dto.secondaryDiagnoses,
        treatmentProvided: dto.treatmentProvided,
        proceduresPerformed: dto.proceduresPerformed,
        conditionAtDischarge: dto.conditionAtDischarge,
        dischargeMedications: dto.dischargeMedications,
        medicationInstructions: dto.medicationInstructions,
        followUpInstructions: dto.followUpInstructions,
        followUpDate,
        warningSigns: dto.warningSigns,
        preparedById: userId,
      },
      include: {
        preparedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dischargeRequest: true,
      },
    });
  }

  async getSummary(requestId: string, hospitalId: string, userId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const summary = await this.prisma.iPDDischargeSummary.findFirst({
      where: {
        dischargeRequestId: requestId,
        hospitalId,
      },
      include: {
        preparedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        dischargeRequest: {
          include: {
            admission: {
              include: {
                patient: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundException('Discharge summary not found.');
    }

    return summary;
  }

  async completeDischarge(
    requestId: string,
    hospitalId: string,
    userId: string,
    dto: CompleteIPDDischargeDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.runDischargeTransaction(async (tx) => {
      const dischargedAt = new Date();

      // 1. Find the approved discharge request.
      const request = await tx.iPDDischargeRequest.findFirst({
        where: {
          id: requestId,
          hospitalId,
        },
      });

      if (!request) {
        throw new NotFoundException('Discharge request not found.');
      }

      if (request.status !== IPDDischargeStatus.APPROVED) {
        throw new ConflictException(
          'Only approved discharge requests can be completed.',
        );
      }

      // 2. Verify that a discharge summary exists.
      const summary = await tx.iPDDischargeSummary.findUnique({
        where: {
          dischargeRequestId: request.id,
        },
      });

      if (!summary) {
        throw new ConflictException(
          'A discharge summary must be prepared before final discharge.',
        );
      }

      // 3. Verify the admission is still active.
      const admission = await tx.iPDAdmission.findFirst({
        where: {
          id: request.admissionId,
          hospitalId,
          status: 'ADMITTED',
        },
      });

      if (!admission) {
        throw new ConflictException('The inpatient admission is not active.');
      }

      // 4. Verify exactly one active bed allocation exists.
      const activeAllocations = await tx.iPDBedAllocation.findMany({
        where: {
          admissionId: admission.id,
          releasedAt: null,
        },
        include: {
          bed: true,
        },
      });

      if (activeAllocations.length !== 1) {
        throw new ConflictException(
          `Expected exactly one active bed allocation, found ${activeAllocations.length}.`,
        );
      }

      const allocation = activeAllocations[0];

      if (allocation.bed.hospitalId !== hospitalId) {
        throw new ConflictException(
          'The allocated bed does not belong to this hospital.',
        );
      }

      if (allocation.bed.status !== BedStatus.OCCUPIED) {
        throw new ConflictException(
          'The allocated bed status is inconsistent. Resolve the bed status before discharge.',
        );
      }

      // 5. Release the allocation using a conditional update.
      const released = await tx.iPDBedAllocation.updateMany({
        where: {
          id: allocation.id,
          releasedAt: null,
        },
        data: {
          releasedAt: dischargedAt,
          releasedById: userId,
        },
      });

      if (released.count !== 1) {
        throw new ConflictException(
          'The bed allocation was already changed. Refresh and retry.',
        );
      }

      // 6. Release the bed.
      const releasedBed = await tx.bed.updateMany({
        where: {
          id: allocation.bedId,
          hospitalId,
          status: BedStatus.OCCUPIED,
        },
        data: {
          status: BedStatus.AVAILABLE,
        },
      });

      if (releasedBed.count !== 1) {
        throw new ConflictException('Could not release the allocated bed.');
      }

      // 7. Close the admission.
      const closedAdmission = await tx.iPDAdmission.updateMany({
        where: {
          id: admission.id,
          hospitalId,
          status: 'ADMITTED',
        },
        data: {
          status: 'DISCHARGED',
          dischargedAt,
          dischargedById: userId,
          dischargeRemarks: dto.remarks,
        },
      });

      if (closedAdmission.count !== 1) {
        throw new ConflictException('The admission could not be closed.');
      }

      // 8. Mark the discharge request as completed.
      const completedRequest = await tx.iPDDischargeRequest.updateMany({
        where: {
          id: request.id,
          hospitalId,
          status: IPDDischargeStatus.APPROVED,
        },
        data: {
          status: IPDDischargeStatus.COMPLETED,
        },
      });

      if (completedRequest.count !== 1) {
        throw new ConflictException(
          'The discharge request status could not be updated.',
        );
      }

      // 9. Return a useful discharge confirmation.
      return {
        message: 'Patient discharge completed successfully.',
        admissionId: admission.id,
        dischargeRequestId: request.id,
        patientId: admission.patientId,
        hospitalId,
        bedId: allocation.bedId,
        dischargedAt,
        dischargedById: userId,
        remarks: dto.remarks ?? null,
        admissionStatus: 'DISCHARGED',
        dischargeStatus: IPDDischargeStatus.COMPLETED,
        bedStatus: BedStatus.AVAILABLE,
      };
    });
  }

  private async runDischargeTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (retryable && attempt < 3) {
          continue;
        }

        if (retryable) {
          throw new ServiceUnavailableException(
            'The discharge operation encountered concurrent changes. Please retry.',
          );
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException('Unable to complete discharge.');
  }

  async getDischargeHistory(hospitalId: string, userId: string) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.prisma.iPDDischargeRequest.findMany({
      where: {
        hospitalId,
        status: IPDDischargeStatus.COMPLETED,
      },
      include: {
        admission: {
          include: {
            patient: true,
            department: true,
          },
        },
        summary: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
    });
  }
}
