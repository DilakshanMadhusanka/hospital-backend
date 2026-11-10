import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import {
  Prisma,
  ServiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateHospitalServiceDto } from './dto/create-hospital-service.dto.js';
import { UpdateHospitalServiceDto } from './dto/update-hospital-service.dto.js';

@Injectable()
export class HospitalServicesService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE
  async create(dto: CreateHospitalServiceDto) {

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    if (dto.departmentId) {

      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          hospitalId: dto.hospitalId,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Department does not belong to the selected hospital',
        );
      }
    }

    const duplicate = await this.prisma.hospitalService.findFirst({
      where: {
        hospitalId: dto.hospitalId,
        code: dto.code,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Service code already exists in this hospital',
      );
    }

    return this.prisma.hospitalService.create({
      data: dto,
      include: {
        hospital: true,
        department: true,
      },
    });
  }

  // FIND ALL
  async findAll(query: {
    page?: number;
    limit?: number;
    hospitalId?: string;
    departmentId?: string;
    search?: string;
    status?: ServiceStatus;
  }) {

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.HospitalServiceWhereInput = {
      ...(query.hospitalId && {
        hospitalId: query.hospitalId,
      }),

      ...(query.departmentId && {
        departmentId: query.departmentId,
      }),

      ...(query.status && {
        status: query.status,
      }),

      ...(query.search && {
        OR: [
          {
            name: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            code: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.hospitalService.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
        },
      }),

      this.prisma.hospitalService.count({ where }),
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

    const service = await this.prisma.hospitalService.findUnique({
      where: { id },
      include: {
        hospital: true,
        department: true,
      },
    });

    if (!service) {
      throw new NotFoundException(
        'Hospital service not found',
      );
    }

    return service;
  }

  // UPDATE
  async update(id: string, dto: UpdateHospitalServiceDto) {

    const service = await this.findOne(id);

    const hospitalId = dto.hospitalId ?? service.hospitalId;
    const departmentId = dto.departmentId !== undefined
      ? dto.departmentId
      : service.departmentId;

    if (dto.hospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        throw new NotFoundException('Hospital not found');
      }
    }

    if (departmentId) {

      const department = await this.prisma.department.findFirst({
        where: {
          id: departmentId,
          hospitalId,
        },
      });

      if (!department) {
        throw new BadRequestException(
          'Department does not belong to the selected hospital',
        );
      }
    }

    const code = dto.code ?? service.code;

    if (hospitalId !== service.hospitalId || code !== service.code) {

      const duplicate = await this.prisma.hospitalService.findFirst({
        where: {
          hospitalId,
          code,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Service code already exists in this hospital',
        );
      }
    }

    return this.prisma.hospitalService.update({
      where: { id },
      data: dto,
    });
  }

  // DEACTIVATE
  async remove(id: string) {

    const service = await this.findOne(id);

    if (service.status === ServiceStatus.INACTIVE) {
      return { message: 'Service is already inactive' };
    }

    return this.prisma.hospitalService.update({
      where: { id },
      data: {
        status: ServiceStatus.INACTIVE,
      },
    });
  }
}