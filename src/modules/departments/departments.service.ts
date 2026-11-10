import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  Prisma,
  DepartmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';
import { DepartmentQueryDto } from './dto/department-query.dto.js';

@Injectable()
export class DepartmentsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE
  async create(dto: CreateDepartmentDto) {

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const existing = await this.prisma.department.findUnique({
      where: {
        hospitalId_code: {
          hospitalId: dto.hospitalId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Department code already exists in this hospital',
      );
    }

    return this.prisma.department.create({
      data: dto,
      include: {
        hospital: true,
      },
    });
  }

  // FIND ALL
  async findAll(query: DepartmentQueryDto) {

    const {
      page = 1,
      limit = 10,
      hospitalId,
      search,
      status,
    } = query;

    const where: Prisma.DepartmentWhereInput = {
      ...(hospitalId && { hospitalId }),
      ...(status && { status }),

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
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              wards: true,
              staffAssignments: true,
            },
          },
        },
      }),

      this.prisma.department.count({ where }),
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

  // FIND ONE
  async findOne(id: string) {

    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        hospital: true,
        wards: true,
        services: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  // UPDATE
  async update(id: string, dto: UpdateDepartmentDto) {

    await this.findOne(id);

    const hospitalId = dto.hospitalId;
    const code = dto.code;

    if (hospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        throw new NotFoundException('Hospital not found');
      }
    }

    if (hospitalId || code) {
      const department = await this.findOne(id);

      const targetHospitalId = hospitalId ?? department.hospitalId;
      const targetCode = code ?? department.code;

      const duplicate = await this.prisma.department.findFirst({
        where: {
          hospitalId: targetHospitalId,
          code: targetCode,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Department code already exists in this hospital',
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  // DEACTIVATE
  async remove(id: string) {

    const department = await this.findOne(id);

    if (department.status === DepartmentStatus.INACTIVE) {
      return { message: 'Department is already inactive' };
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        status: DepartmentStatus.INACTIVE,
      },
    });
  }
}