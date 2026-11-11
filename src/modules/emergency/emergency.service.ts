import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  EmergencyTriageCategory,
  EmergencyEncounterStatus,
  Prisma,
} from '@prisma/client';

import { AssignEmergencyStaffDto } from './dto/assign-emergency-staff.dto.js';
import { QueryEmergencyQueueDto } from './dto/query-emergency-queue.dto.js';

import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateEmergencyEncounterDto } from './dto/create-emergency-encounter.dto.js';
import { CreateEmergencyTriageDto } from './dto/create-emergency-triage.dto.js';

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAccess(hospitalId: string, userId: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        hospitalId,
        userId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this hospital.');
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

  async getEncounter(hospitalId: string, userId: string, encounterId: string) {
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

  private readonly triagePriority: Record<EmergencyTriageCategory, number> = {
    RESUSCITATION: 1,
    EMERGENCY: 2,
    URGENT: 3,
    LESS_URGENT: 4,
    NON_URGENT: 5,
  };

  async getEmergencyQueue(
    hospitalId: string,
    userId: string,
    query: QueryEmergencyQueueDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const encounters = await this.prisma.emergencyEncounter.findMany({
      where: {
        hospitalId,
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        status: {
          in: [
            EmergencyEncounterStatus.TRIAGED,
            EmergencyEncounterStatus.WAITING,
            EmergencyEncounterStatus.CALLED,
          ],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedNurse: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        triages: {
          orderBy: {
            assessedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    const queue = encounters.map((encounter) => {
      const latestTriage = encounter.triages[0];

      return {
        ...encounter,
        latestTriage,
        priority: latestTriage
          ? this.triagePriority[latestTriage.category]
          : 99,
        waitingMinutes: Math.max(
          0,
          Math.floor((Date.now() - encounter.arrivedAt.getTime()) / 60000),
        ),
      };
    });

    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      return a.arrivedAt.getTime() - b.arrivedAt.getTime();
    });

    return {
      hospitalId,
      totalPatients: queue.length,
      patients: queue,
    };
  }

  async assignEmergencyStaff(
    hospitalId: string,
    userId: string,
    encounterId: string,
    dto: AssignEmergencyStaffDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    if (!dto.doctorId && !dto.nurseId) {
      throw new BadRequestException(
        'Provide at least a doctor ID or nurse ID.',
      );
    }

    const encounter = await this.prisma.emergencyEncounter.findFirst({
      where: {
        id: encounterId,
        hospitalId,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Emergency encounter not found.');
    }

    const closedStatuses: EmergencyEncounterStatus[] = [
      EmergencyEncounterStatus.ADMITTED,
      EmergencyEncounterStatus.TRANSFERRED,
      EmergencyEncounterStatus.DISCHARGED,
      EmergencyEncounterStatus.LEFT_WITHOUT_BEING_SEEN,
      EmergencyEncounterStatus.DECEASED,
      EmergencyEncounterStatus.CANCELLED,
    ];

    if (closedStatuses.includes(encounter.status)) {
      throw new BadRequestException(
        'Cannot assign staff to a closed emergency encounter.',
      );
    }

    if (dto.doctorId) {
      const doctorAssignment = await this.prisma.userRole.findFirst({
        where: {
          userId: dto.doctorId,
          hospitalId,
          role: {
            name: 'DOCTOR',
          },
        },
      });

      if (!doctorAssignment) {
        throw new BadRequestException(
          'The selected doctor is not assigned to this hospital with the DOCTOR role.',
        );
      }
    }

    if (dto.nurseId) {
      const nurseAssignment = await this.prisma.userRole.findFirst({
        where: {
          userId: dto.nurseId,
          hospitalId,
          role: {
            name: 'NURSE',
          },
        },
      });

      if (!nurseAssignment) {
        throw new BadRequestException(
          'The selected nurse is not assigned to this hospital with the NURSE role.',
        );
      }
    }

    return this.prisma.emergencyEncounter.update({
      where: {
        id: encounterId,
      },
      data: {
        ...(dto.doctorId ? { assignedDoctorId: dto.doctorId } : {}),
        ...(dto.nurseId ? { assignedNurseId: dto.nurseId } : {}),
      },
      include: {
        assignedDoctor: true,
        assignedNurse: true,
      },
    });
  }

  async callEmergencyPatient(
    hospitalId: string,
    userId: string,
    encounterId: string,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const result = await this.prisma.emergencyEncounter.updateMany({
      where: {
        id: encounterId,
        hospitalId,
        status: {
          in: [
            EmergencyEncounterStatus.TRIAGED,
            EmergencyEncounterStatus.WAITING,
          ],
        },
      },
      data: {
        status: EmergencyEncounterStatus.CALLED,
        calledAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Patient cannot be called. Check the encounter status.',
      );
    }

    return this.prisma.emergencyEncounter.findFirst({
      where: {
        id: encounterId,
        hospitalId,
      },
      include: {
        patient: true,
        assignedDoctor: true,
        assignedNurse: true,
      },
    });
  }

  async startEmergencyTreatment(
    hospitalId: string,
    userId: string,
    encounterId: string,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const result = await this.prisma.emergencyEncounter.updateMany({
      where: {
        id: encounterId,
        hospitalId,
        status: EmergencyEncounterStatus.CALLED,
      },
      data: {
        status: EmergencyEncounterStatus.IN_TREATMENT,
        treatmentStartedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Patient must be called before treatment can start.',
      );
    }

    return this.prisma.emergencyEncounter.findFirst({
      where: {
        id: encounterId,
        hospitalId,
      },
      include: {
        patient: true,
        assignedDoctor: true,
        assignedNurse: true,
        triages: {
          orderBy: {
            assessedAt: 'desc',
          },
        },
      },
    });
  }
}
