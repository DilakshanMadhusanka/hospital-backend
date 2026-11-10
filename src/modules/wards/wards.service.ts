import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateWardDto } from './dto/create-ward.dto.js';
import { UpdateWardDto } from './dto/update-ward.dto.js';

import { Prisma } from '@prisma/client';

@Injectable()
export class WardsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE
  async create(dto: CreateWardDto) {

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
        'Department does not belong to the selected hospital',
      );
    }

    const duplicate = await this.prisma.ward.findFirst({
      where: {
        hospitalId: dto.hospitalId,
        code: dto.code,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ward code already exists in this hospital',
      );
    }

    return this.prisma.ward.create({
      data: dto,
      include: {
        department: true,
        hospital: true,
      },
    });
  }

  // FIND ALL
  async findAll(
    query: {
      page?: number;
      limit?: number;
      hospitalId?: string;
      departmentId?: string;
      search?: string;
      type?: string;
    },
  ) {

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.WardWhereInput = {
      ...(query.hospitalId && {
        hospitalId: query.hospitalId,
      }),

      ...(query.departmentId && {
        departmentId: query.departmentId,
      }),

      ...(query.type && {
        type: query.type as any,
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
      this.prisma.ward.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              beds: true,
            },
          },
        },
      }),

      this.prisma.ward.count({ where }),
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

    const ward = await this.prisma.ward.findUnique({
      where: { id },
      include: {
        hospital: true,
        department: true,
        beds: true,
      },
    });

    if (!ward) {
      throw new NotFoundException('Ward not found');
    }

    return ward;
  }

  // UPDATE
  async update(id: string, dto: UpdateWardDto) {

    const ward = await this.findOne(id);

    const hospitalId = dto.hospitalId ?? ward.hospitalId;
    const departmentId = dto.departmentId ?? ward.departmentId;
    const code = dto.code ?? ward.code;

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

    if (dto.hospitalId && dto.hospitalId !== ward.hospitalId) {
      if (ward.beds.length > 0) {
        throw new BadRequestException(
          'Cannot move a ward containing beds to another hospital',
        );
      }
    }

    const duplicate = await this.prisma.ward.findFirst({
      where: {
        hospitalId,
        code,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'Ward code already exists in this hospital',
      );
    }

    return this.prisma.ward.update({
      where: { id },
      data: dto,
    });
  }

  // DELETE
  async remove(id: string) {

    const ward = await this.findOne(id);

    if (ward.beds.length > 0) {
      throw new BadRequestException(
        'Cannot delete a ward containing beds',
      );
    }

    return this.prisma.ward.delete({
      where: { id },
    });
  }
}