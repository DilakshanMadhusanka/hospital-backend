import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  Prisma,
  HospitalStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateHospitalDto } from './dto/create-hospital.dto.js';
import { UpdateHospitalDto } from './dto/update-hospital.dto.js';
import { HospitalQueryDto } from './dto/hospital-query.dto.js';

@Injectable()
export class HospitalsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE HOSPITAL
  async create(dto: CreateHospitalDto) {

    const existing = await this.prisma.hospital.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        'Hospital code already exists',
      );
    }

    return this.prisma.hospital.create({
      data: dto,
    });
  }

  // GET ALL HOSPITALS
  private async getHospitalScope(userId: string): Promise<string[] | null> {
    const systemAdminAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId: null,
        role: { name: 'SYSTEM_ADMIN' },
      },
      select: { id: true },
    });

    if (systemAdminAssignment) {
      return null;
    }

    const assignments = await this.prisma.userRole.findMany({
      where: { userId, hospitalId: { not: null } },
      select: { hospitalId: true },
    });

    return [
      ...new Set(
        assignments
          .map((assignment) => assignment.hospitalId)
          .filter((hospitalId): hospitalId is string => hospitalId !== null),
      ),
    ];
  }

  async findAll(query: HospitalQueryDto, userId: string) {

    const {
      page = 1,
      limit = 10,
      search,
      district,
      type,
      status,
    } = query;

    const skip = (page - 1) * limit;
    const hospitalScope = await this.getHospitalScope(userId);

    const where: Prisma.HospitalWhereInput = {
      ...(hospitalScope !== null && {
        id: { in: hospitalScope },
      }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),

      ...(district && {
        district: {
          equals: district,
          mode: 'insensitive',
        },
      }),

      ...(type && { type }),
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              departments: true,
              wards: true,
              registrations: true,
            },
          },
        },
      }),

      this.prisma.hospital.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET ONE HOSPITAL
  async findOne(id: string, userId: string) {
    const hospitalScope = await this.getHospitalScope(userId);
    if (hospitalScope !== null && !hospitalScope.includes(id)) {
      throw new NotFoundException('Hospital not found');
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        departments: true,
        wards: true,
        services: true,
        _count: {
          select: {
            registrations: true,
            staffAssignments: true,
          },
        },
      },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return hospital;
  }

  // UPDATE HOSPITAL
  async update(id: string, dto: UpdateHospitalDto) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (dto.code) {
      const existing = await this.prisma.hospital.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Hospital code already exists',
        );
      }
    }

    return this.prisma.hospital.update({
      where: { id },
      data: dto,
    });
  }

  // DEACTIVATE HOSPITAL
  async remove(id: string) {

    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (hospital.status === HospitalStatus.INACTIVE) {
      return {
        message: 'Hospital is already inactive',
      };
    }

    return this.prisma.hospital.update({
      where: { id },
      data: {
        status: HospitalStatus.INACTIVE,
      },
    });
  }
}