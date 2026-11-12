
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  EmergencyEncounterStatus,
  IPDAdmissionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { CreateEmergencyDispositionDto } from './dto/create-emergency-disposition.dto.js';

const EmergencyDispositionType = {
  ADMITTED: 'ADMITTED',
  TRANSFERRED: 'TRANSFERRED',
  DISCHARGED: 'DISCHARGED',
  DECEASED: 'DECEASED',
  LEFT_WITHOUT_BEING_SEEN: 'LEFT_WITHOUT_BEING_SEEN',
} as const;

type EmergencyDispositionType =
  (typeof EmergencyDispositionType)[keyof typeof EmergencyDispositionType];

@Injectable()
export class EmergencyDispositionService {
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

  private async verifyDoctorRole(
    hospitalId: string,
    userId: string,
  ) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        hospitalId,
        userId,
        role: {
          name: 'DOCTOR',
        },
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Only an authorized doctor can finalize this emergency outcome.',
      );
    }
  }

  async createDisposition(
    hospitalId: string,
    userId: string,
    encounterId: string,
    dto: CreateEmergencyDispositionDto,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);
    await this.verifyDoctorRole(hospitalId, userId);

    const encounter =
      await this.prisma.emergencyEncounter.findFirst({
        where: {
          id: encounterId,
          hospitalId,
        },
      });

    if (!encounter) {
      throw new NotFoundException(
        'Emergency encounter not found.',
      );
    }

    const existingDisposition =
      await (this.prisma as any).emergencyDisposition.findFirst({
        where: {
          encounterId,
          hospitalId,
        },
        select: {
          id: true,
        },
      });

    if (existingDisposition) {
      throw new ConflictException(
        'A final disposition has already been recorded.',
      );
    }

    const allowedActiveStatuses: EmergencyEncounterStatus[] = [
      EmergencyEncounterStatus.REGISTERED,
      EmergencyEncounterStatus.TRIAGED,
      EmergencyEncounterStatus.WAITING,
      EmergencyEncounterStatus.CALLED,
      EmergencyEncounterStatus.IN_TREATMENT,
    ];

    if (!allowedActiveStatuses.includes(encounter.status)) {
      throw new BadRequestException(
        'This encounter is already closed.',
      );
    }

    // Patients who leave without being seen must not have
    // a completed doctor assessment.
    if (
      String(dto.outcome) ===
      EmergencyDispositionType.LEFT_WITHOUT_BEING_SEEN
    ) {
      const assessmentCount =
        await this.prisma.emergencyClinicalAssessment.count({
          where: {
            encounterId,
            hospitalId,
          },
        });

      if (assessmentCount > 0) {
        throw new BadRequestException(
          'This patient has a clinical assessment and cannot be recorded as left without being seen.',
        );
      }
    }

    let linkedAdmission: { id: string } | null = null;

    if (dto.outcome === EmergencyDispositionType.ADMITTED) {
      if (!encounter.patientId) {
        throw new BadRequestException(
          'Identify and link the patient before creating an IPD admission.',
        );
      }

      if (!dto.ipdAdmissionId) {
        throw new BadRequestException(
          'An IPD admission ID is required.',
        );
      }

      linkedAdmission =
        await this.prisma.iPDAdmission.findFirst({
          where: {
            id: dto.ipdAdmissionId,
            hospitalId,
            patientId: encounter.patientId,
            status: IPDAdmissionStatus.ADMITTED,
          },
          select: {
            id: true,
          },
        });

      if (!linkedAdmission) {
        throw new BadRequestException(
          'The supplied IPD admission is not an active admission for this patient at this hospital.',
        );
      }
    }

    if (
      dto.outcome === EmergencyDispositionType.TRANSFERRED &&
      (!dto.receivingHospitalName || !dto.transferReason)
    ) {
      throw new BadRequestException(
        'Receiving hospital and transfer reason are required.',
      );
    }

    if (
      dto.outcome === EmergencyDispositionType.DISCHARGED &&
      !dto.dischargeInstructions
    ) {
      throw new BadRequestException(
        'Discharge instructions are required.',
      );
    }

    if (dto.outcome === EmergencyDispositionType.DECEASED) {
      if (!dto.deathAt || !dto.deathDocumentation) {
        throw new BadRequestException(
          'Death time and authorized documentation are required.',
        );
      }

      const deathTime = new Date(dto.deathAt);

      if (Number.isNaN(deathTime.getTime()) || deathTime > new Date()) {
        throw new BadRequestException(
          'The recorded death time must be a valid time in the past or present.',
        );
      }
    }

    const finalStatus: Record<
      EmergencyDispositionType,
      EmergencyEncounterStatus
    > = {
      ADMITTED: EmergencyEncounterStatus.ADMITTED,
      TRANSFERRED: EmergencyEncounterStatus.TRANSFERRED,
      DISCHARGED: EmergencyEncounterStatus.DISCHARGED,
      DECEASED: EmergencyEncounterStatus.DECEASED,
      LEFT_WITHOUT_BEING_SEEN:
        EmergencyEncounterStatus.LEFT_WITHOUT_BEING_SEEN,
    };

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Conditional update protects against two users
          // closing the same encounter simultaneously.
          const updated =
            await tx.emergencyEncounter.updateMany({
              where: {
                id: encounterId,
                hospitalId,
                status: {
                  in: allowedActiveStatuses,
                },
              },
              data: {
                status: finalStatus[dto.outcome as keyof typeof finalStatus],
              },
            });

          if (updated.count !== 1) {
            throw new ConflictException(
              'The encounter was already closed or changed by another user.',
            );
          }

          const disposition =
            await (tx as any).emergencyDisposition.create({
              data: {
                hospitalId,
                encounterId,
                outcome: dto.outcome,
                ipdAdmissionId:
                  linkedAdmission?.id ?? null,

                receivingHospitalName:
                  dto.receivingHospitalName,
                receivingHospitalContact:
                  dto.receivingHospitalContact,
                transferReason: dto.transferReason,
                transferNotes: dto.transferNotes,

                dischargeInstructions:
                  dto.dischargeInstructions,
                followUpInstructions:
                  dto.followUpInstructions,
                followUpDate: dto.followUpDate
                  ? new Date(dto.followUpDate)
                  : null,

                deathAt: dto.deathAt
                  ? new Date(dto.deathAt)
                  : null,
                deathDocumentation:
                  dto.deathDocumentation,

                recordedById: userId,
              },
            });

          return disposition;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A disposition already exists for this encounter or admission.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'The encounter changed concurrently. Reload it and try again.',
        );
      }

      throw error;
    }
  }

  async getDisposition(
    hospitalId: string,
    userId: string,
    encounterId: string,
  ) {
    await this.verifyHospitalAccess(hospitalId, userId);

    const disposition =
      await (this.prisma as any).emergencyDisposition.findFirst({
        where: {
          encounterId,
          hospitalId,
        },
        include: {
          encounter: {
            select: {
              id: true,
              encounterNumber: true,
              patientId: true,
              status: true,
            },
          },
          ipdAdmission: {
            select: {
              id: true,
              admissionNumber: true,
              status: true,
              admissionDate: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    if (!disposition) {
      throw new NotFoundException(
        'No disposition has been recorded for this encounter.',
      );
    }

    return disposition;
  }
}
