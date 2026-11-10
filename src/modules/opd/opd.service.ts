import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';

import { RegisterOpdVisitDto } from './dto/register-opd-visit.dto.js';
import { AssignDoctorDto } from './dto/assign-doctor.dto.js';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto.js';
import { CreateConsultationDto } from './dto/create-consultation.dto.js';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto.js';
import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import { CreateInvestigationDto } from './dto/create-investigation.dto.js';

@Injectable()
export class OpdService {
  constructor(private readonly prisma: PrismaService) {}

  // Use Sri Lankan calendar date for daily tokens.
  private getSriLankaDate() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value;

    const dateString = `${get('year')}-${get('month')}-${get('day')}`;

    return new Date(`${dateString}T00:00:00.000Z`);
  }

  private generateVisitNumber() {
    const year = new Date().getFullYear();
    return `OPD-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async verifyDepartment(hospitalId: string, departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        hospitalId,
      },
    });

    if (!department) {
      throw new NotFoundException(
        'Department does not belong to this hospital',
      );
    }

    return department;
  }

  private async verifyPatientRegistration(
    patientId: string,
    hospitalId: string,
  ) {
    const registration = await this.prisma.hospitalPatient.findFirst({
      where: {
        patientId,
        hospitalId,
        status: 'ACTIVE',
      },
    });

    if (!registration) {
      throw new BadRequestException(
        'Patient is not registered at this hospital',
      );
    }

    return registration;
  }

  // Register a patient for OPD.
  async registerVisit(dto: RegisterOpdVisitDto) {
    await this.verifyDepartment(dto.hospitalId, dto.departmentId);

    await this.verifyPatientRegistration(dto.patientId, dto.hospitalId);

    const visitDay = this.getSriLankaDate();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create counter if absent; otherwise increment it.
        const counter = await tx.oPDTokenCounter.upsert({
          where: {
            hospitalId_departmentId_visitDay: {
              hospitalId: dto.hospitalId,
              departmentId: dto.departmentId,
              visitDay,
            },
          },
          create: {
            hospitalId: dto.hospitalId,
            departmentId: dto.departmentId,
            visitDay,
            lastToken: 1,
          },
          update: {
            lastToken: {
              increment: 1,
            },
          },
        });

        const visit = await tx.oPDVisit.create({
          data: {
            visitNumber: this.generateVisitNumber(),
            tokenNumber: counter.lastToken,
            visitDay,
            patientId: dto.patientId,
            hospitalId: dto.hospitalId,
            departmentId: dto.departmentId,
            chiefComplaint: dto.chiefComplaint,
            status: 'WAITING',
          },
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
          },
        });

        return {
          message: 'OPD visit registered successfully',
          visit,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A visit or token with these details already exists. Please retry.',
        );
      }

      throw error;
    }
  }

  // View today's queue.
  async getQueue(hospitalId: string, departmentId: string, status?: string) {
    await this.verifyDepartment(hospitalId, departmentId);

    const visitDay = this.getSriLankaDate();

    return this.prisma.oPDVisit.findMany({
      where: {
        hospitalId,
        departmentId,
        visitDay,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: {
        tokenNumber: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Get an OPD visit.
  async getVisit(visitId: string) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
        hospital: true,
        department: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        consultation: true,
        vitalSigns: true,
        prescriptions: {
          include: {
            items: true,
          },
        },
        investigations: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    return visit;
  }

  // Assign a doctor to a visit.
  async assignDoctor(visitId: string, dto: AssignDoctorDto) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    const doctorAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.doctorId,
        hospitalId: visit.hospitalId,
        role: {
          name: 'DOCTOR',
        },
      },
    });

    if (!doctorAssignment) {
      throw new BadRequestException(
        'Selected user is not a doctor assigned to this hospital',
      );
    }

    return this.prisma.oPDVisit.update({
      where: { id: visitId },
      data: {
        doctorId: dto.doctorId,
      },
    });
  }

  // Change OPD visit status.
  async updateVisitStatus(visitId: string, status: string) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    const transitions: Record<string, string[]> = {
      REGISTERED: ['WAITING', 'CANCELLED'],
      WAITING: ['CALLED', 'CANCELLED', 'NO_SHOW'],
      CALLED: ['WAITING', 'IN_CONSULTATION', 'NO_SHOW', 'CANCELLED'],
      IN_CONSULTATION: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (!transitions[visit.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot change visit status from ${visit.status} to ${status}`,
      );
    }

    return this.prisma.oPDVisit.update({
      where: { id: visitId },
      data: {
        status: status as any,
      },
    });
  }

  // Create a doctor schedule.
  async createDoctorSchedule(dto: CreateDoctorScheduleDto) {
    await this.verifyDepartment(dto.hospitalId, dto.departmentId);

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('End time must be later than start time');
    }

    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.doctorId,
        hospitalId: dto.hospitalId,
        role: { name: 'DOCTOR' },
      },
    });

    if (!assignment) {
      throw new BadRequestException(
        'User is not a doctor assigned to this hospital',
      );
    }

    return this.prisma.doctorSchedule.create({
      data: {
        ...dto,
        slotMinutes: dto.slotMinutes ?? 15,
      },
    });
  }

  // List doctor schedules.
  async getDoctorSchedules(hospitalId: string, departmentId: string) {
    await this.verifyDepartment(hospitalId, departmentId);

    return this.prisma.doctorSchedule.findMany({
      where: {
        hospitalId,
        departmentId,
        isActive: true,
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  // Start or update a consultation.
  async saveConsultation(
    visitId: string,
    doctorId: string,
    dto: CreateConsultationDto,
  ) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    if (visit.doctorId !== doctorId) {
      throw new ForbiddenException('This visit is not assigned to you');
    }

    if (!['CALLED', 'IN_CONSULTATION'].includes(visit.status)) {
      throw new BadRequestException(
        'Visit must be called before consultation begins',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.oPDVisit.update({
        where: { id: visitId },
        data: { status: 'IN_CONSULTATION' },
      });

      return tx.consultation.upsert({
        where: { visitId },
        create: {
          visitId,
          doctorId,
          symptoms: dto.symptoms,
          diagnosis: dto.diagnosis,
          clinicalNotes: dto.clinicalNotes,
          treatmentPlan: dto.treatmentPlan,
          followUpDate: dto.followUpDate
            ? new Date(dto.followUpDate)
            : undefined,
        },
        update: {
          symptoms: dto.symptoms,
          diagnosis: dto.diagnosis,
          clinicalNotes: dto.clinicalNotes,
          treatmentPlan: dto.treatmentPlan,
          followUpDate: dto.followUpDate
            ? new Date(dto.followUpDate)
            : undefined,
        },
      });
    });
  }

  // Complete consultation and visit.
  async completeConsultation(visitId: string, doctorId: string) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
      include: { consultation: true },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    if (visit.doctorId !== doctorId) {
      throw new ForbiddenException('This visit is not assigned to you');
    }

    if (visit.status !== 'IN_CONSULTATION' || !visit.consultation) {
      throw new BadRequestException('An active consultation is required');
    }

    return this.prisma.$transaction([
      this.prisma.consultation.update({
        where: { visitId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      }),
      this.prisma.oPDVisit.update({
        where: { id: visitId },
        data: { status: 'COMPLETED' },
      }),
    ]);
  }

  // Record vital signs.
  async recordVitalSigns(
    visitId: string,
    recordedBy: string,
    dto: CreateVitalSignsDto,
  ) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(visit.status)) {
      throw new BadRequestException(
        'Cannot record vital signs for a closed visit',
      );
    }

    return this.prisma.vitalSigns.create({
      data: {
        visitId,
        recordedBy,
        ...dto,
      },
    });
  }

  // Create prescription.
  async createPrescription(
    visitId: string,
    doctorId: string,
    dto: CreatePrescriptionDto,
  ) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    if (visit.doctorId !== doctorId) {
      throw new ForbiddenException(
        'Only the assigned doctor can prescribe for this visit',
      );
    }

    if (visit.status !== 'IN_CONSULTATION') {
      throw new BadRequestException(
        'Prescription requires an active consultation',
      );
    }

    return this.prisma.prescription.create({
      data: {
        visitId,
        doctorId,
        notes: dto.notes,
        items: {
          create: dto.items,
        },
      },
      include: {
        items: true,
      },
    });
  }

  // Request a laboratory investigation.
  async requestInvestigation(
    visitId: string,
    doctorId: string,
    dto: CreateInvestigationDto,
  ) {
    const visit = await this.prisma.oPDVisit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      throw new NotFoundException('OPD visit not found');
    }

    if (visit.doctorId !== doctorId) {
      throw new ForbiddenException(
        'Only the assigned doctor can request investigations',
      );
    }

    if (visit.status !== 'IN_CONSULTATION') {
      throw new BadRequestException(
        'Investigation requires an active consultation',
      );
    }

    return this.prisma.investigationRequest.create({
      data: {
        visitId,
        doctorId,
        ...dto,
      },
    });
  }
}
