import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  BloodGroup as PrismaBloodGroup,
  ContactType,
  AllergySeverity,
  PatientSex as PrismaPatientSex,
  Prisma,
} from '@prisma/client';

import { randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service.js';

import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';

import { CreateAddressDto } from './dto/create-address.dto.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto.js';
import { CreateAllergyDto } from './dto/create-allergy.dto.js';

const patientSexMap: Record<
  NonNullable<CreatePatientDto['gender']>,
  PrismaPatientSex
> = {
  MALE: PrismaPatientSex.MALE,
  FEMALE: PrismaPatientSex.FEMALE,
  OTHER: PrismaPatientSex.OTHER,
  UNKNOWN: PrismaPatientSex.UNKNOWN,
};

const bloodGroupMap: Record<
  NonNullable<CreatePatientDto['bloodGroup']>,
  PrismaBloodGroup
> = {
  'A+': PrismaBloodGroup.A_POSITIVE,
  'A-': PrismaBloodGroup.A_NEGATIVE,
  'B+': PrismaBloodGroup.B_POSITIVE,
  'B-': PrismaBloodGroup.B_NEGATIVE,
  'AB+': PrismaBloodGroup.AB_POSITIVE,
  'AB-': PrismaBloodGroup.AB_NEGATIVE,
  'O+': PrismaBloodGroup.O_POSITIVE,
  'O-': PrismaBloodGroup.O_NEGATIVE,
  UNKNOWN: PrismaBloodGroup.UNKNOWN,
};

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private generatePatientNumber(): string {
    const year = new Date().getFullYear();
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `HMS-${year}-${random}`;
  }

  private generateRegistrationNumber(): string {
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `REG-${random}`;
  }

  private async checkHospital(hospitalId: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return hospital;
  }

  async registerPatient(dto: CreatePatientDto) {
    await this.checkHospital(dto.hospitalId);

    const nic = dto.nic?.trim().toUpperCase();
    const passportNumber = dto.passportNumber?.trim().toUpperCase();

    // Check whether the NIC is already registered.
    if (nic) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { nic },
      });

      if (existingPatient) {
        const registration = await this.prisma.hospitalPatient.findUnique({
          where: {
            patientId_hospitalId: {
              hospitalId: dto.hospitalId,
              patientId: existingPatient.id,
            },
          },
        });

        if (registration) {
          throw new ConflictException(
            'This patient is already registered at this hospital',
          );
        }

        throw new ConflictException(
          'A patient with this NIC already exists. Verify the identity and use the existing patient record.',
        );
      }
    }

    if (passportNumber) {
      const existingPatient = await this.prisma.patient.findUnique({
        where: { passportNumber },
      });

      if (existingPatient) {
        throw new ConflictException(
          'A patient with this passport number already exists. Verify the identity before creating another record.',
        );
      }
    }

    const patientNumber = this.generatePatientNumber();
    const registrationNumber = this.generateRegistrationNumber();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: {
            patientNumber,
            nic,
            passportNumber,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            gender: dto.gender ? patientSexMap[dto.gender] : undefined,
            bloodGroup: dto.bloodGroup
              ? bloodGroupMap[dto.bloodGroup]
              : undefined,
            phone: dto.phone,
            email: dto.email?.toLowerCase(),
          },
        });

        const registration = await tx.hospitalPatient.create({
          data: {
            patientId: patient.id,
            hospitalId: dto.hospitalId,
            registrationNumber,
            status: 'ACTIVE',
          },
        });

        return {
          message: 'Patient registered successfully',
          patient,
          registration,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A patient or registration with these details already exists',
        );
      }

      throw error;
    }
  }

  async findAll(query: PatientQueryDto) {
    await this.checkHospital(query.hospitalId);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const where = {
      registrations: {
        some: {
          hospitalId: query.hospitalId,
          status: 'ACTIVE' as const,
        },
      },
      ...(search
        ? {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                patientNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                nic: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          registrations: {
            where: {
              hospitalId: query.hospitalId,
            },
            select: {
              id: true,
              registrationNumber: true,
              registeredAt: true,
              status: true,
            },
          },
        },
      }),

      this.prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(patientId: string, hospitalId: string) {
    await this.checkHospital(hospitalId);

    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        registrations: {
          some: {
            hospitalId,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        registrations: {
          where: { hospitalId },
          include: {
            hospital: {
              select: {
                id: true,
                name: true,
                district: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found in this hospital');
    }

    return patient;
  }

  async update(patientId: string, hospitalId: string, dto: UpdatePatientDto) {
    await this.findOne(patientId, hospitalId);

    const updateData = { ...dto };

    delete updateData.hospitalId;

    const nic = updateData.nic;
    const passportNumber = updateData.passportNumber;

    delete updateData.nic;
    delete updateData.passportNumber;

    // Identity changes require a separate verified workflow.
    if (nic || passportNumber) {
      throw new BadRequestException(
        'NIC and passport changes require identity verification',
      );
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        ...updateData,
        firstName: updateData.firstName?.trim(),
        lastName: updateData.lastName?.trim(),
        email: updateData.email?.toLowerCase(),
        gender: updateData.gender
          ? patientSexMap[updateData.gender]
          : undefined,
        bloodGroup: updateData.bloodGroup
          ? bloodGroupMap[updateData.bloodGroup]
          : undefined,
        dateOfBirth: updateData.dateOfBirth
          ? new Date(updateData.dateOfBirth)
          : undefined,
      },
    });
  }

  async addAddress(
    patientId: string,
    hospitalId: string,
    dto: CreateAddressDto,
  ) {
    await this.findOne(patientId, hospitalId);

    return this.prisma.patientAddress.create({
      data: {
        patientId,
        ...dto,
      },
    });
  }

  async addContact(
    patientId: string,
    hospitalId: string,
    dto: CreateContactDto,
  ) {
    await this.findOne(patientId, hospitalId);

    return this.prisma.patientContact.create({
      data: {
        patientId,
        name: dto.name,
        relationship: dto.relationship,
        isEmergency: dto.isEmergency,
        type: ContactType.OTHER,
        value: dto.phone,
      },
    });
  }

  async addMedicalHistory(
    patientId: string,
    hospitalId: string,
    dto: CreateMedicalHistoryDto,
  ) {
    await this.findOne(patientId, hospitalId);

    return this.prisma.patientMedicalHistory.create({
      data: {
        patientId,
        condition: dto.condition,
        description: dto.description,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : null,
      },
    });
  }

  async addAllergy(
    patientId: string,
    hospitalId: string,
    dto: CreateAllergyDto,
  ) {
    await this.findOne(patientId, hospitalId);

    return this.prisma.patientAllergy.create({
      data: {
        patientId,
        substance: dto.allergen,
        reaction: dto.reaction,
        severity: dto.severity ? AllergySeverity[dto.severity] : undefined,
      },
    });
  }

  async getPatientClinicalInformation(patientId: string, hospitalId: string) {
    await this.findOne(patientId, hospitalId);

    const [medicalHistory, allergies] = await Promise.all([
      this.prisma.patientMedicalHistory.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.patientAllergy.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      medicalHistory,
      allergies,
    };
  }
}
