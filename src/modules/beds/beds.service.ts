import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import {
  Prisma,
  BedStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateBedDto } from './dto/create-bed.dto.js';
import { UpdateBedDto } from './dto/update-bed.dto.js';

@Injectable()
export class BedsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE BED
  async create(dto: CreateBedDto) {

    const ward = await this.prisma.ward.findFirst({
      where: {
        id: dto.wardId,
        hospitalId: dto.hospitalId,
      },
    });

    if (!ward) {
      throw new BadRequestException(
        'Ward does not belong to the selected hospital',
      );
    }

    const existing = await this.prisma.bed.findFirst({
      where: {
        wardId: dto.wardId,
        bedNumber: dto.bedNumber,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Bed number already exists in this ward',
      );
    }

    return this.prisma.bed.create({
      data: dto,
      include: {
        ward: true,
        hospital: true,
      },
    });
  }

  // GET ALL BEDS
  async findAll(query: {
    page?: number;
    limit?: number;
    hospitalId?: string;
    wardId?: string;
    status?: BedStatus;
    search?: string;
  }) {

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.BedWhereInput = {
      ...(query.hospitalId && {
        hospitalId: query.hospitalId,
      }),

      ...(query.wardId && {
        wardId: query.wardId,
      }),

      ...(query.status && {
        status: query.status,
      }),

      ...(query.search && {
        bedNumber: {
          contains: query.search,
          mode: 'insensitive',
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bed.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          bedNumber: 'asc',
        },
        include: {
          ward: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          hospital: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      this.prisma.bed.count({ where }),
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

  // GET ONE BED
  async findOne(id: string) {

    const bed = await this.prisma.bed.findUnique({
      where: { id },
      include: {
        ward: true,
        hospital: true,
      },
    });

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return bed;
  }

  // UPDATE BED
  async update(id: string, dto: UpdateBedDto) {

    const bed = await this.findOne(id);

    if (dto.bedNumber) {

      const duplicate = await this.prisma.bed.findFirst({
        where: {
          wardId: bed.wardId,
          bedNumber: dto.bedNumber,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Bed number already exists in this ward',
        );
      }
    }

    // Bed status changes will be restricted later
    // through admission and discharge workflows.
    if (
      bed.status === BedStatus.OCCUPIED &&
      dto.status &&
      dto.status !== BedStatus.OCCUPIED
    ) {
      throw new BadRequestException(
        'An occupied bed cannot be released through this endpoint. Use the patient discharge workflow.',
      );
    }

    return this.prisma.bed.update({
      where: { id },
      data: dto,
    });
  }

  // DELETE BED
  async remove(id: string) {

    const bed = await this.findOne(id);

    if (
      bed.status === BedStatus.OCCUPIED ||
      bed.status === BedStatus.RESERVED
    ) {
      throw new BadRequestException(
        'Occupied or reserved beds cannot be deleted',
      );
    }

    return this.prisma.bed.delete({
      where: { id },
    });
  }

  // BED AVAILABILITY SUMMARY
  async getAvailability(hospitalId: string) {

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const grouped = await this.prisma.bed.groupBy({
      by: ['status'],
      where: {
        hospitalId,
      },
      _count: {
        id: true,
      },
    });

    const counts = Object.fromEntries(
      grouped.map((item) => [
        item.status,
        item._count.id,
      ]),
    );

    const totalBeds = grouped.reduce(
      (sum, item) => sum + item._count.id,
      0,
    );

    return {
      hospitalId,
      hospitalName: hospital.name,
      totalBeds,
      available: counts.AVAILABLE ?? 0,
      occupied: counts.OCCUPIED ?? 0,
      reserved: counts.RESERVED ?? 0,
      maintenance: counts.MAINTENANCE ?? 0,
      outOfService: counts.OUT_OF_SERVICE ?? 0,
      occupancyRate: totalBeds > 0
        ? Number(
            (
              ((counts.OCCUPIED ?? 0) / totalBeds) * 100
            ).toFixed(2),
          )
        : 0,
    };
  }
}