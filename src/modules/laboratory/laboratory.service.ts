import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';

import { CreateLabTestDto } from './dto/create-lab-test.dto.js';
import { CreateLabRequestDto } from './dto/create-lab-request.dto.js';
import { CollectSampleDto } from './dto/collect-sample.dto.js';
import { ReceiveSampleDto } from './dto/receive-sample.dto.js';
import { EnterLabResultDto } from './dto/enter-lab-result.dto.js';

@Injectable()
export class LaboratoryService {
  constructor(private readonly prisma: PrismaService) {}

  private generateNumber(prefix: string): string {
    const year = new Date().getFullYear();
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `${prefix}-${year}-${random}`;
  }

  // --------------------------------------------------
  // 1. CREATE LAB TEST
  // --------------------------------------------------

  async createLabTest(
    hospitalId: string,
    dto: CreateLabTestDto,
  ) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.labTest.create({
      data: {
        hospitalId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        specimenType: dto.specimenType,
        unit: dto.unit,
        referenceRange: dto.referenceRange,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // --------------------------------------------------
  // 2. GET LAB TEST CATALOGUE
  // --------------------------------------------------

  async getLabTests(hospitalId: string) {
    return this.prisma.labTest.findMany({
      where: {
        hospitalId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // --------------------------------------------------
  // 3. CREATE LAB REQUEST
  // --------------------------------------------------

  async createLabRequest(
    dto: CreateLabRequestDto,
    userId: string,
  ) {
    if (
      Boolean(dto.opdVisitId) === Boolean(dto.ipdAdmissionId)
    ) {
      throw new BadRequestException(
        'Provide exactly one of opdVisitId or ipdAdmissionId',
      );
    }

    const registration =
      await this.prisma.hospitalPatient.findFirst({
        where: {
          patientId: dto.patientId,
          hospitalId: dto.hospitalId,
          status: 'ACTIVE',
        },
      });

    if (!registration) {
      throw new BadRequestException(
        'Patient is not registered at this hospital',
      );
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        hospitalId: dto.hospitalId,
      },
    });

    if (!department) {
      throw new BadRequestException(
        'Department does not belong to this hospital',
      );
    }

    if (dto.opdVisitId) {
      const visit = await this.prisma.oPDVisit.findFirst({
        where: {
          id: dto.opdVisitId,
          patientId: dto.patientId,
          hospitalId: dto.hospitalId,
        },
      });

      if (!visit) {
        throw new BadRequestException(
          'OPD visit does not match this patient and hospital',
        );
      }
    }

    if (dto.ipdAdmissionId) {
      const admission = await this.prisma.iPDAdmission.findFirst({
        where: {
          id: dto.ipdAdmissionId,
          patientId: dto.patientId,
          hospitalId: dto.hospitalId,
          status: 'ADMITTED',
        },
      });

      if (!admission) {
        throw new BadRequestException(
          'Active IPD admission does not match this patient and hospital',
        );
      }
    }

    const uniqueTestIds = [...new Set(dto.testIds)];

    if (uniqueTestIds.length !== dto.testIds.length) {
      throw new BadRequestException(
        'Duplicate laboratory tests are not allowed',
      );
    }

    const tests = await this.prisma.labTest.findMany({
      where: {
        id: { in: uniqueTestIds },
        hospitalId: dto.hospitalId,
        isActive: true,
      },
    });

    if (tests.length !== uniqueTestIds.length) {
      throw new BadRequestException(
        'One or more tests are invalid, inactive, or belong to another hospital',
      );
    }

    return this.prisma.labRequest.create({
      data: {
        requestNumber: this.generateNumber('LAB'),
        patientId: dto.patientId,
        hospitalId: dto.hospitalId,
        departmentId: dto.departmentId,
        opdVisitId: dto.opdVisitId,
        ipdAdmissionId: dto.ipdAdmissionId,
        requestedById: userId,
        priority: dto.priority,
        clinicalNotes: dto.clinicalNotes,
        status: 'REQUESTED',

        items: {
          create: uniqueTestIds.map((testId) => ({
            testId,
            status: 'REQUESTED',
          })),
        },
      },
      include: {
        patient: true,
        department: true,
        items: {
          include: { test: true },
        },
      },
    });
  }

  // --------------------------------------------------
  // 4. GET LAB REQUESTS
  // --------------------------------------------------

  async getLabRequests(
    hospitalId: string,
    status?: string,
  ) {
    const allowedStatuses = [
      'REQUESTED',
      'ACCEPTED',
      'IN_PROGRESS',
      'PARTIALLY_COMPLETED',
      'COMPLETED',
      'CANCELLED',
    ];

    if (status && !allowedStatuses.includes(status)) {
      throw new BadRequestException(
        'Invalid laboratory request status',
      );
    }

    return this.prisma.labRequest.findMany({
      where: {
        hospitalId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        department: true,
        items: {
          include: {
            test: true,
            sample: true,
            result: true,
          },
        },
      },
    });
  }

  // --------------------------------------------------
  // 5. GET SINGLE REQUEST
  // --------------------------------------------------

  async getLabRequest(requestId: string) {
    const request = await this.prisma.labRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: true,
        hospital: true,
        department: true,
        requestedBy: true,
        items: {
          include: {
            test: true,
            sample: true,
            result: {
              include: {
                enteredBy: true,
                verifiedBy: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Laboratory request not found');
    }

    return request;
  }

  // --------------------------------------------------
  // 6. COLLECT SAMPLE
  // --------------------------------------------------

  async collectSample(
    itemId: string,
    dto: CollectSampleDto,
    userId: string,
  ) {
    const item = await this.prisma.labRequestItem.findUnique({
      where: { id: itemId },
      include: {
        request: true,
        test: true,
        sample: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Laboratory request item not found');
    }

    if (item.request.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot collect a sample for a cancelled request',
      );
    }

    if (item.status !== 'REQUESTED') {
      throw new ConflictException(
        'Sample collection is not allowed for this item status',
      );
    }

    if (item.sample) {
      throw new ConflictException(
        'A sample has already been recorded',
      );
    }

    if (dto.specimenType !== item.test.specimenType) {
      throw new BadRequestException(
        `Expected specimen type: ${item.test.specimenType}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labRequestItem.updateMany({
        where: {
          id: itemId,
          status: 'REQUESTED',
        },
        data: {
          status: 'SAMPLE_COLLECTED',
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Request item has already changed',
        );
      }

      const sample = await tx.labSample.create({
        data: {
          sampleNumber: this.generateNumber('SAMPLE'),
          requestItemId: itemId,
          specimenType: dto.specimenType,
          collectedById: userId,
          status: 'COLLECTED',
        },
      });

      await tx.labRequest.update({
        where: { id: item.requestId },
        data: { status: 'IN_PROGRESS' },
      });

      return sample;
    });
  }

  // --------------------------------------------------
  // 7. RECEIVE OR REJECT SAMPLE
  // --------------------------------------------------

  async receiveSample(
    itemId: string,
    dto: ReceiveSampleDto,
  ) {
    const item = await this.prisma.labRequestItem.findUnique({
      where: { id: itemId },
      include: { sample: true },
    });

    if (!item || !item.sample) {
      throw new NotFoundException('Collected sample not found');
    }

    if (item.sample.status !== 'COLLECTED') {
      throw new ConflictException(
        'This sample has already been received or processed',
      );
    }

    if (
      dto.action === 'REJECTED' &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException(
        'A rejection reason is required',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const sample = await tx.labSample.update({
        where: { id: item.sample!.id },
        data: {
          status: dto.action,
          receivedAt:
            dto.action === 'RECEIVED' ? new Date() : null,
          rejectionReason:
            dto.action === 'REJECTED'
              ? dto.rejectionReason
              : null,
        },
      });

      await tx.labRequestItem.update({
        where: { id: itemId },
        data: {
          status:
            dto.action === 'RECEIVED'
              ? 'SAMPLE_COLLECTED'
              : 'REJECTED',
        },
      });

      return sample;
    });
  }

  // --------------------------------------------------
  // 8. ENTER RESULT
  // --------------------------------------------------

  async enterResult(
    itemId: string,
    dto: EnterLabResultDto,
    userId: string,
  ) {
    const item = await this.prisma.labRequestItem.findUnique({
      where: { id: itemId },
      include: {
        sample: true,
        result: true,
        request: true,
        test: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Request item not found');
    }

    if (item.request.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot enter a result for a cancelled request',
      );
    }

    if (item.sample?.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Sample must be received before entering results',
      );
    }

    if (item.result?.status === 'VERIFIED') {
      throw new ConflictException(
        'Verified results cannot be overwritten',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.labResult.upsert({
        where: { requestItemId: itemId },
        create: {
          requestItemId: itemId,
          resultValue: dto.resultValue,
          unit: dto.unit ?? item.test.unit,
          referenceRange:
            dto.referenceRange ?? item.test.referenceRange,
          interpretation: dto.interpretation,
          remarks: dto.remarks,
          enteredById: userId,
          status: 'DRAFT',
        },
        update: {
          resultValue: dto.resultValue,
          unit: dto.unit ?? item.test.unit,
          referenceRange:
            dto.referenceRange ?? item.test.referenceRange,
          interpretation: dto.interpretation,
          remarks: dto.remarks,
          enteredById: userId,
          enteredAt: new Date(),
          verifiedById: null,
          verifiedAt: null,
          status: 'DRAFT',
        },
      });

      await tx.labRequestItem.update({
        where: { id: itemId },
        data: { status: 'RESULT_ENTERED' },
      });

      await tx.labSample.update({
        where: { requestItemId: itemId },
        data: { status: 'PROCESSED' },
      });

      return result;
    });
  }

  // --------------------------------------------------
  // 9. VERIFY RESULT
  // --------------------------------------------------

  async verifyResult(
    itemId: string,
    verifierId: string,
  ) {
    const item = await this.prisma.labRequestItem.findUnique({
      where: { id: itemId },
      include: {
        result: true,
        request: true,
      },
    });

    if (!item || !item.result) {
      throw new NotFoundException('Laboratory result not found');
    }

    if (item.result.status !== 'DRAFT') {
      throw new ConflictException(
        'Only draft results can be verified',
      );
    }

    if (item.result.enteredById === verifierId) {
      throw new BadRequestException(
        'The person who entered a result cannot verify the same result',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labResult.updateMany({
        where: {
          id: item.result!.id,
          status: 'DRAFT',
        },
        data: {
          status: 'VERIFIED',
          verifiedById: verifierId,
          verifiedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Result has already been verified or changed',
        );
      }

      await tx.labRequestItem.update({
        where: { id: itemId },
        data: { status: 'VERIFIED' },
      });

      const remaining = await tx.labRequestItem.count({
        where: {
          requestId: item.requestId,
          status: { notIn: ['VERIFIED', 'CANCELLED', 'REJECTED'] },
        },
      });

      const verified = await tx.labRequestItem.count({
        where: {
          requestId: item.requestId,
          status: 'VERIFIED',
        },
      });

      const total = await tx.labRequestItem.count({
        where: { requestId: item.requestId },
      });

      let requestStatus:
        | 'REQUESTED'
        | 'IN_PROGRESS'
        | 'PARTIALLY_COMPLETED'
        | 'COMPLETED' = 'IN_PROGRESS';

      if (remaining === 0 && verified === total) {
        requestStatus = 'COMPLETED';
      } else if (verified > 0) {
        requestStatus = 'PARTIALLY_COMPLETED';
      }

      await tx.labRequest.update({
        where: { id: item.requestId },
        data: { status: requestStatus },
      });

      return tx.labResult.findUnique({
        where: { id: item.result!.id },
      });
    });
  }

  // --------------------------------------------------
  // 10. GET VERIFIED PATIENT REPORTS
  // --------------------------------------------------

  async getVerifiedPatientReports(
    patientId: string,
    hospitalId: string,
  ) {
    return this.prisma.labRequest.findMany({
      where: {
        patientId,
        hospitalId,
        items: {
          some: {
            status: 'VERIFIED',
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        items: {
          where: { status: 'VERIFIED' },
          include: {
            test: true,
            sample: true,
            result: {
              include: {
                verifiedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}