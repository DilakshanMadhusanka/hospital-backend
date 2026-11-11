
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EmergencyEncounterStatus,
  Prisma,
} from '@prisma/client';

import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateEmergencyEncounterDto } from './dto/create-emergency-encounter.dto.js';
import { CreateEmergencyTriageDto } from './dto/create-emergency-triage.dto.js';

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAccess(
    hospitalId: string,
    userId: string,
  ) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        hospitalId,
        userId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have access to this hospital.',
      );
    }
  }

  private generateEncounterNumber(): string {
    const date = new Date();

    const year = date.getFullYear();
    const suffix = randomBytes(4).toString('hex').toUpperCase();

    return `ETU-${year}-${suffix}`;
  }

  async createEncounter(
    hospitalId: string,
    userId: string,
    dto: CreateEmergencyEncounterDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const isUnknown = dto.isUnknownPatient ?? false;

    if (isUnknown && dto.patientId) {
      throw new BadRequestException(
        'An unknown patient cannot have an existing patient ID.',
      );
    }

    if (!isUnknown && !dto.patientId) {
      throw new BadRequestException(
        'Provide a patient ID or mark the patient as unknown.',
      );
    }

    if (isUnknown && !dto.temporaryPatientName) {
      throw new BadRequestException(
        'Provide temporary identifying details for an unknown patient.',
      );
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id: dto.departmentId,
        hospitalId,
      },
    });

    if (!department) {
      throw new NotFoundException(
        'Emergency department not found in this hospital.',
      );
    }

    if (dto.patientId) {
      const registration = await this.prisma.hospitalPatient.findFirst({
        where: {
          patientId: dto.patientId,
          hospitalId,
          status: 'ACTIVE',
        },
      });

      if (!registration) {
        throw new BadRequestException(
          'Patient is not registered with this hospital.',
        );
      }
    }

    return this.prisma.emergencyEncounter.create({
      data: {
        hospitalId,
        departmentId: dto.departmentId,
        patientId: dto.patientId ?? null,

        encounterNumber: this.generateEncounterNumber(),

        arrivalMode: dto.arrivalMode,
        arrivalSource: dto.arrivalSource,
        referralHospital: dto.referralHospital,

        isUnknownPatient: isUnknown,
        temporaryPatientName: dto.temporaryPatientName,
        temporaryAge: dto.temporaryAge,
        temporaryGender: dto.temporaryGender,
        identifyingNotes: dto.identifyingNotes,

        chiefComplaint: dto.chiefComplaint,
        registeredById: userId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async createTriage(
    hospitalId: string,
    userId: string,
    dto: CreateEmergencyTriageDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const encounter = await this.prisma.emergencyEncounter.findFirst({
      where: {
        id: dto.encounterId,
        hospitalId,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Emergency encounter not found.');
    }

    const terminalStatuses: EmergencyEncounterStatus[] = [
      EmergencyEncounterStatus.ADMITTED,
      EmergencyEncounterStatus.TRANSFERRED,
      EmergencyEncounterStatus.DISCHARGED,
      EmergencyEncounterStatus.LEFT_WITHOUT_BEING_SEEN,
      EmergencyEncounterStatus.DECEASED,
      EmergencyEncounterStatus.CANCELLED,
    ];

    if (terminalStatuses.includes(encounter.status)) {
      throw new BadRequestException(
        'Triage cannot be added to a closed emergency encounter.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const triage = await tx.emergencyTriage.create({
        data: {
          encounterId: encounter.id,
          category: dto.category,
          chiefComplaint: dto.chiefComplaint,
          symptoms: dto.symptoms,
          triageNotes: dto.triageNotes,
          temperatureC: dto.temperatureC,
          systolicBP: dto.systolicBP,
          diastolicBP: dto.diastolicBP,
          pulseRate: dto.pulseRate,
          respiratoryRate: dto.respiratoryRate,
          oxygenSaturation: dto.oxygenSaturation,
          painScore: dto.painScore,
          assessedById: userId,
        },
      });

      await tx.emergencyEncounter.update({
        where: {
          id: encounter.id,
        },
        data: {
          status: EmergencyEncounterStatus.TRIAGED,
          chiefComplaint: dto.chiefComplaint,
        },
      });

      return triage;
    });
  }

  async getEncounter(
    hospitalId: string,
    userId: string,
    encounterId: string,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const encounter = await this.prisma.emergencyEncounter.findFirst({
      where: {
        id: encounterId,
        hospitalId,
      },
      include: {
        patient: true,
        department: true,
        triages: {
          orderBy: {
            assessedAt: 'desc',
          },
        },
      },
    });

    if (!encounter) {
      throw new NotFoundException('Emergency encounter not found.');
    }

    return encounter;
  }
}
