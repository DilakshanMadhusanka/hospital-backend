import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateAdmissionDto } from './dto/create-admission.dto.js';
import { AllocateBedDto } from './dto/allocate-bed.dto.js';
import { TransferBedDto } from './dto/transfer-bed.dto.js';
import { CreateObservationDto } from './dto/create-observation.dto.js';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto.js';
import { DischargePatientDto } from './dto/discharge-patient.dto.js';

import { BedStatus, IPDAdmissionStatus, Prisma } from '@prisma/client';

import { TransferIPDBedDto } from './dto/transfer-ipd-bed.dto.js';

@Injectable()
export class IpdService {
  constructor(private readonly prisma: PrismaService) {}

  private generateAdmissionNumber(): string {
    const year = new Date().getFullYear();
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `IPD-${year}-${random}`;
  }

  private async getAdmission(admissionId: string) {
    const admission = await this.prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        hospital: true,
        department: true,
        attendingDoctor: {
          select: { id: true, firstName: true, lastName: true },
        },
        bedAllocations: {
          where: { releasedAt: null },
          include: {
            bed: {
              include: { ward: true },
            },
          },
        },
      },
    });

    if (!admission) {
      throw new NotFoundException('IPD admission not found');
    }

    return admission;
  }

  private async verifyDoctor(doctorId: string, hospitalId: string) {
    const doctorRole = await this.prisma.userRole.findFirst({
      where: {
        userId: doctorId,
        hospitalId,
        role: { name: 'DOCTOR' },
      },
    });

    if (!doctorRole) {
      throw new BadRequestException(
        'The selected user is not a doctor assigned to this hospital',
      );
    }
  }

  // 1. Admit a patient
  async createAdmission(dto: CreateAdmissionDto, userId: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
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

    const patientRegistration = await this.prisma.hospitalPatient.findFirst({
      where: {
        patientId: dto.patientId,
        hospitalId: dto.hospitalId,
        status: 'ACTIVE',
      },
    });

    if (!patientRegistration) {
      throw new BadRequestException(
        'Patient is not actively registered at this hospital',
      );
    }

    if (dto.attendingDoctorId) {
      await this.verifyDoctor(dto.attendingDoctorId, dto.hospitalId);
    }

    return this.prisma.iPDAdmission.create({
      data: {
        admissionNumber: this.generateAdmissionNumber(),
        patientId: dto.patientId,
        hospitalId: dto.hospitalId,
        departmentId: dto.departmentId,
        admittedById: userId,
        attendingDoctorId: dto.attendingDoctorId,
        admissionReason: dto.admissionReason,
        admissionDiagnosis: dto.admissionDiagnosis,
        clinicalNotes: dto.clinicalNotes,
      },
      include: {
        patient: true,
        department: true,
        hospital: true,
      },
    });
  }

  // 2. Allocate a bed
  async allocateBed(admissionId: string, dto: AllocateBedDto, userId: string) {
    const admission = await this.getAdmission(admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        'Beds can only be allocated to active admissions',
      );
    }

    if (admission.bedAllocations.length > 0) {
      throw new ConflictException(
        'This admission already has an allocated bed',
      );
    }

    const bed = await this.prisma.bed.findFirst({
      where: {
        id: dto.bedId,
        hospitalId: admission.hospitalId,
      },
    });

    if (!bed) {
      throw new NotFoundException('Bed not found in this hospital');
    }

    if (bed.status !== 'AVAILABLE') {
      throw new ConflictException('Bed is not available');
    }

    return this.prisma.$transaction(async (tx) => {
      // Atomic conditional update prevents two requests from
      // allocating the same AVAILABLE bed.
      const updated = await tx.bed.updateMany({
        where: {
          id: dto.bedId,
          hospitalId: admission.hospitalId,
          status: 'AVAILABLE',
        },
        data: { status: 'OCCUPIED' },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Bed is no longer available. Refresh and try again.',
        );
      }

      return tx.iPDBedAllocation.create({
        data: {
          admissionId,
          bedId: dto.bedId,
          allocatedById: userId,
        },
        include: {
          bed: { include: { ward: true } },
          admission: true,
        },
      });
    });
  }

  // 3. Transfer patient to another bed
  // async transferBed(admissionId: string, dto: TransferBedDto, userId: string) {
  //   const admission = await this.getAdmission(admissionId);

  //   if (admission.status !== 'ADMITTED') {
  //     throw new BadRequestException(
  //       'Only active admissions can be transferred',
  //     );
  //   }

  //   const currentAllocation = admission.bedAllocations[0];

  //   if (!currentAllocation) {
  //     throw new BadRequestException(
  //       'Patient does not currently have an allocated bed',
  //     );
  //   }

  //   if (currentAllocation.bedId === dto.newBedId) {
  //     throw new BadRequestException('Patient is already allocated to this bed');
  //   }

  //   const newBed = await this.prisma.bed.findFirst({
  //     where: {
  //       id: dto.newBedId,
  //       hospitalId: admission.hospitalId,
  //     },
  //   });

  //   if (!newBed) {
  //     throw new NotFoundException('Destination bed not found in this hospital');
  //   }

  //   if (newBed.status !== 'AVAILABLE') {
  //     throw new ConflictException('Destination bed is not available');
  //   }

  //   return this.prisma.$transaction(async (tx) => {
  //     const destinationUpdated = await tx.bed.updateMany({
  //       where: {
  //         id: dto.newBedId,
  //         hospitalId: admission.hospitalId,
  //         status: 'AVAILABLE',
  //       },
  //       data: { status: 'OCCUPIED' },
  //     });

  //     if (destinationUpdated.count !== 1) {
  //       throw new ConflictException('Destination bed is no longer available');
  //     }

  //     const released = await tx.iPDBedAllocation.updateMany({
  //       where: {
  //         id: currentAllocation.id,
  //         releasedAt: null,
  //       },
  //       data: {
  //         releasedAt: new Date(),
  //         releasedById: userId,
  //       },
  //     });

  //     if (released.count !== 1) {
  //       throw new ConflictException(
  //         'Current bed allocation has already changed',
  //       );
  //     }

  //     const oldBedUpdated = await tx.bed.updateMany({
  //       where: {
  //         id: currentAllocation.bedId,
  //         status: 'OCCUPIED',
  //       },
  //       data: { status: 'AVAILABLE' },
  //     });

  //     if (oldBedUpdated.count !== 1) {
  //       throw new ConflictException('Could not release the previous bed');
  //     }

  //     return tx.iPDBedAllocation.create({
  //       data: {
  //         admissionId,
  //         bedId: dto.newBedId,
  //         allocatedById: userId,
  //       },
  //       include: {
  //         bed: { include: { ward: true } },
  //       },
  //     });
  //   });
  // }

  // 4. Record patient observations
  async createObservation(
    admissionId: string,
    dto: CreateObservationDto,
    userId: string,
  ) {
    const admission = await this.getAdmission(admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        'Observations can only be added to active admissions',
      );
    }

    return this.prisma.iPDObservation.create({
      data: {
        admissionId,
        recordedById: userId,
        type: dto.type ?? 'ROUTINE',
        temperature: dto.temperature,
        systolicBP: dto.systolicBP,
        diastolicBP: dto.diastolicBP,
        pulseRate: dto.pulseRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSaturation: dto.oxygenSaturation,
        weightKg: dto.weightKg,
        notes: dto.notes,
      },
    });
  }

  // 5. Record nursing notes
  async createNursingNote(
    admissionId: string,
    dto: CreateNursingNoteDto,
    userId: string,
  ) {
    const admission = await this.getAdmission(admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException(
        'Nursing notes can only be added to active admissions',
      );
    }

    return this.prisma.iPDNursingNote.create({
      data: {
        admissionId,
        recordedById: userId,
        note: dto.note,
        careProvided: dto.careProvided,
      },
    });
  }

  // 6. Discharge patient and release bed
  async dischargePatient(
    admissionId: string,
    dto: DischargePatientDto,
    userId: string,
  ) {
    const admission = await this.getAdmission(admissionId);

    if (admission.status !== 'ADMITTED') {
      throw new BadRequestException('This admission is not active');
    }

    return this.prisma.$transaction(async (tx) => {
      const activeAllocation = await tx.iPDBedAllocation.findFirst({
        where: {
          admissionId,
          releasedAt: null,
        },
      });

      if (activeAllocation) {
        const released = await tx.iPDBedAllocation.updateMany({
          where: {
            id: activeAllocation.id,
            releasedAt: null,
          },
          data: {
            releasedAt: new Date(),
            releasedById: userId,
          },
        });

        if (released.count !== 1) {
          throw new ConflictException('Bed allocation has already changed');
        }

        const bedReleased = await tx.bed.updateMany({
          where: {
            id: activeAllocation.bedId,
            status: 'OCCUPIED',
          },
          data: { status: 'AVAILABLE' },
        });

        if (bedReleased.count !== 1) {
          throw new ConflictException('Could not release the allocated bed');
        }
      }

      return tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          status: 'DISCHARGED',
          dischargeDate: new Date(),
          dischargeSummary: dto.dischargeSummary,
          dischargeInstructions: dto.dischargeInstructions,
        },
        include: {
          patient: true,
          bedAllocations: {
            include: { bed: true },
          },
        },
      });
    });
  }

  // 7. Retrieve an admission
  async getAdmissionDetails(admissionId: string) {
    return this.getAdmission(admissionId);
  }

  // 8. List admissions for a hospital
  async getAdmissions(hospitalId: string, status?: string) {
    return this.prisma.iPDAdmission.findMany({
      where: {
        hospitalId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { admissionDate: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            nic: true,
          },
        },
        department: true,
        attendingDoctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        bedAllocations: {
          where: { releasedAt: null },
          include: { bed: { include: { ward: true } } },
        },
      },
    });
  }

  // 9. View bed availability
  async getAvailableBeds(hospitalId: string, wardId?: string) {
    return this.prisma.bed.findMany({
      where: {
        hospitalId,
        status: 'AVAILABLE',
        ...(wardId ? { wardId } : {}),
      },
      include: {
        ward: true,
      },
      orderBy: [{ ward: { name: 'asc' } }, { bedNumber: 'asc' }],
    });
  }

  // 10. View observations and nursing notes
  async getClinicalRecords(admissionId: string) {
    await this.getAdmission(admissionId);

    const [observations, nursingNotes] = await Promise.all([
      this.prisma.iPDObservation.findMany({
        where: { admissionId },
        orderBy: { recordedAt: 'desc' },
        include: {
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.iPDNursingNote.findMany({
        where: { admissionId },
        orderBy: { recordedAt: 'desc' },
        include: {
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return { observations, nursingNotes };
  }

  async transferBed(
    admissionId: string,
    hospitalId: string,
    userId: string,
    dto: TransferIPDBedDto,
  ) {
    // Verify hospital assignment.
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this hospital.');
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // Find the current active allocation.
            const currentAllocation = await tx.iPDBedAllocation.findFirst({
              where: {
                admissionId,
                releasedAt: null,
              },
              include: {
                admission: true,
                bed: {
                  include: {
                    ward: true,
                  },
                },
              },
            });

            if (!currentAllocation) {
              throw new NotFoundException(
                'No active bed allocation exists for this admission.',
              );
            }

            const admission = currentAllocation.admission;

            if (admission.hospitalId !== hospitalId) {
              throw new ForbiddenException(
                'This admission does not belong to the selected hospital.',
              );
            }

            if (admission.status !== IPDAdmissionStatus.ADMITTED) {
              throw new BadRequestException(
                'Only currently admitted patients can be transferred.',
              );
            }

            if (currentAllocation.bedId === dto.toBedId) {
              throw new BadRequestException(
                'The patient is already allocated to this bed.',
              );
            }

            // Find the target bed within the same hospital.
            const targetBed = await tx.bed.findFirst({
              where: {
                id: dto.toBedId,
                hospitalId,
              },
              include: {
                ward: true,
              },
            });

            if (!targetBed) {
              throw new NotFoundException(
                'Target bed not found in this hospital.',
              );
            }

            if (targetBed.status !== BedStatus.AVAILABLE) {
              throw new ConflictException('The selected bed is not available.');
            }

            // Check that there is no active allocation for this bed.
            const existingAllocation = await tx.iPDBedAllocation.findFirst({
              where: {
                bedId: targetBed.id,
                releasedAt: null,
              },
            });

            if (existingAllocation) {
              throw new ConflictException(
                'The selected bed already has an active allocation.',
              );
            }

            const now = new Date();

            // 1. Release the previous allocation.
            const released = await tx.iPDBedAllocation.updateMany({
              where: {
                id: currentAllocation.id,
                releasedAt: null,
              },
              data: {
                releasedAt: now,
                releasedById: userId,
              },
            });

            if (released.count !== 1) {
              throw new ConflictException(
                'The current bed allocation has already changed.',
              );
            }

            // 2. Release the previous bed.
            await tx.bed.update({
              where: {
                id: currentAllocation.bedId,
              },
              data: {
                status: BedStatus.AVAILABLE,
              },
            });

            // 3. Claim the target bed conditionally.
            const claimed = await tx.bed.updateMany({
              where: {
                id: targetBed.id,
                hospitalId,
                status: BedStatus.AVAILABLE,
              },
              data: {
                status: BedStatus.OCCUPIED,
              },
            });

            if (claimed.count !== 1) {
              throw new ConflictException(
                'The target bed was allocated by another user.',
              );
            }

            // 4. Create the new allocation.
            const newAllocation = await tx.iPDBedAllocation.create({
              data: {
                admissionId,
                bedId: targetBed.id,
                allocatedById: userId,
                allocatedAt: now,
              },
              include: {
                bed: {
                  include: {
                    ward: true,
                  },
                },
                admission: true,
              },
            });

            return {
              message: 'Patient bed transferred successfully.',
              previousBed: {
                bedId: currentAllocation.bed.id,
                bedNumber: currentAllocation.bed.bedNumber,
                ward: currentAllocation.bed.ward.name,
                releasedAt: now,
              },
              newBed: {
                bedId: targetBed.id,
                bedNumber: targetBed.bedNumber,
                ward: targetBed.ward.name,
                allocatedAt: now,
              },
              allocation: newAllocation,
            };
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
            'The bed allocation is being modified. Please retry.',
          );
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException('Unable to transfer the patient.');
  }
}
