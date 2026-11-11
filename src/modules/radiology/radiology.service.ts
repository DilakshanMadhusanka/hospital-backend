import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  RadiologyPriority,
  RadiologyRequestStatus,
} from '@prisma/client';

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
  private async verifyHospitalAccess(
    userId: string,
    hospitalId: string,
  ) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have access to this hospital.',
      );
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
      throw new BadRequestException(
        'Invalid or inactive radiology procedure.',
      );
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
      orderBy: [
        { priority: 'desc' },
        { requestedAt: 'asc' },
      ],
    });
  }

  /**
   * Get one request.
   */
  async getRequestById(
    hospitalId: string,
    userId: string,
    requestId: string,
  ) {
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
}