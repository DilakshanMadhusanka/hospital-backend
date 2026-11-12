import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssetMovementType,
  HospitalAssetStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateAssetCategoryDto } from './dto/create-asset-category.dto.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { UpdateAssetDto } from './dto/update-asset.dto.js';
import { MoveAssetDto } from './dto/move-asset.dto.js';
import { QueryAssetsDto } from './dto/query-assets.dto.js';

@Injectable()
export class AssetManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------
  // Authorization
  // --------------------------------------------------

  private async verifyHospitalAdmin(
    userId: string,
    hospitalId: string,
  ) {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
        role: {
          name: 'HOSPITAL_ADMIN',
        },
      },
    });

    if (!role) {
      throw new ForbiddenException(
        'Only authorized hospital administrators can manage assets.',
      );
    }
  }

  // --------------------------------------------------
  // Validate department
  // --------------------------------------------------

  private async validateDepartment(
    hospitalId: string,
    departmentId?: string,
  ) {
    if (!departmentId) return;

    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        hospitalId,
        status: 'ACTIVE',
      },
    });

    if (!department) {
      throw new BadRequestException(
        'Invalid or inactive department for this hospital.',
      );
    }
  }

  // --------------------------------------------------
  // Validate ward
  // --------------------------------------------------

  private async validateWard(
    hospitalId: string,
    wardId?: string,
    departmentId?: string,
  ) {
    if (!wardId) return;

    const ward = await this.prisma.ward.findFirst({
      where: {
        id: wardId,
        hospitalId,
        ...(departmentId ? { departmentId } : {}),
      },
    });

    if (!ward) {
      throw new BadRequestException(
        'Invalid ward or ward does not belong to the selected department.',
      );
    }
  }

  // --------------------------------------------------
  // Validate staff assignment
  // --------------------------------------------------

  private async validateStaffAssignment(
    hospitalId: string,
    staffAssignmentId?: string,
  ) {
    if (!staffAssignmentId) return;

    const assignment =
      await this.prisma.hospitalStaffAssignment.findFirst({
        where: {
          id: staffAssignmentId,
          hospitalId,
          status: 'ACTIVE',
        },
      });

    if (!assignment) {
      throw new BadRequestException(
        'Invalid or inactive staff assignment.',
      );
    }
  }

  // --------------------------------------------------
  // 1. Create asset category
  // --------------------------------------------------

  async createCategory(
    hospitalId: string,
    userId: string,
    dto: CreateAssetCategoryDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    try {
      return await this.prisma.assetCategory.create({
        data: {
          hospitalId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An asset category with this code already exists.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 2. List categories
  // --------------------------------------------------

  async getCategories(hospitalId: string) {
    return this.prisma.assetCategory.findMany({
      where: {
        hospitalId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // --------------------------------------------------
  // 3. Register hospital asset
  // --------------------------------------------------

  async createAsset(
    hospitalId: string,
    userId: string,
    dto: CreateAssetDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const category =
      await this.prisma.assetCategory.findFirst({
        where: {
          id: dto.categoryId,
          hospitalId,
          isActive: true,
        },
      });

    if (!category) {
      throw new BadRequestException(
        'Active asset category not found.',
      );
    }

    await this.validateDepartment(
      hospitalId,
      dto.departmentId,
    );

    await this.validateWard(
      hospitalId,
      dto.wardId,
      dto.departmentId,
    );

    await this.validateStaffAssignment(
      hospitalId,
      dto.assignedStaffAssignmentId,
    );

    if (
      dto.wardId &&
      !dto.departmentId
    ) {
      throw new BadRequestException(
        'A department must be selected when assigning an asset to a ward.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const asset = await tx.hospitalAsset.create({
          data: {
            hospitalId,
            categoryId: dto.categoryId,
            assetCode: dto.assetCode.trim().toUpperCase(),
            name: dto.name.trim(),
            description: dto.description,
            manufacturer: dto.manufacturer,
            modelNumber: dto.modelNumber,
            serialNumber: dto.serialNumber,
            purchaseDate: dto.purchaseDate
              ? new Date(`${dto.purchaseDate}T00:00:00.000Z`)
              : undefined,
            purchasePrice:
              dto.purchasePrice !== undefined
                ? new Prisma.Decimal(dto.purchasePrice)
                : undefined,
            supplierName: dto.supplierName,
            warrantyExpiryDate: dto.warrantyExpiryDate
              ? new Date(
                  `${dto.warrantyExpiryDate}T00:00:00.000Z`,
                )
              : undefined,
            departmentId: dto.departmentId,
            wardId: dto.wardId,
            assignedStaffAssignmentId:
              dto.assignedStaffAssignmentId,
            locationDescription: dto.locationDescription,
            notes: dto.notes,
            registeredById: userId,
            status: dto.assignedStaffAssignmentId
              ? 'IN_USE'
              : 'AVAILABLE',
          },
          include: {
            category: true,
            department: true,
            ward: true,
          },
        });

        await tx.assetMovement.create({
          data: {
            hospitalId,
            assetId: asset.id,
            movementType: AssetMovementType.INITIAL_REGISTRATION,
            toDepartmentId: dto.departmentId,
            toWardId: dto.wardId,
            toStaffAssignmentId:
              dto.assignedStaffAssignmentId,
            reason: 'Initial asset registration',
            performedById: userId,
          },
        });

        return asset;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An asset with this asset code or unique identifier already exists.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 4. List and search assets
  // --------------------------------------------------

  async getAssets(
    hospitalId: string,
    query: QueryAssetsDto,
  ) {
    return this.prisma.hospitalAsset.findMany({
      where: {
        hospitalId,
        ...(query.categoryId
          ? { categoryId: query.categoryId }
          : {}),
        ...(query.departmentId
          ? { departmentId: query.departmentId }
          : {}),
        ...(query.status
          ? { status: query.status }
          : {}),
        ...(query.condition
          ? { condition: query.condition }
          : {}),
        ...(query.search
          ? {
              OR: [
                {
                  assetCode: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  serialNumber: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  manufacturer: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        department: true,
        ward: true,
        assignedStaffAssignment: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });
  }

  // --------------------------------------------------
  // 5. Get individual asset
  // --------------------------------------------------

  async getAsset(
    hospitalId: string,
    assetId: string,
  ) {
    const asset = await this.prisma.hospitalAsset.findFirst({
      where: {
        id: assetId,
        hospitalId,
      },
      include: {
        category: true,
        department: true,
        ward: true,
        assignedStaffAssignment: {
          include: {
            user: true,
          },
        },
        movements: {
          include: {
            performedBy: true,
          },
          orderBy: {
            performedAt: 'desc',
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Hospital asset not found.');
    }

    return asset;
  }

  // --------------------------------------------------
  // 6. Update asset information
  // --------------------------------------------------

  async updateAsset(
    hospitalId: string,
    userId: string,
    assetId: string,
    dto: UpdateAssetDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const asset = await this.prisma.hospitalAsset.findFirst({
      where: {
        id: assetId,
        hospitalId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Hospital asset not found.');
    }

    if (asset.status === 'DISPOSED') {
      throw new BadRequestException(
        'Disposed assets cannot be updated.',
      );
    }

    if (
      dto.status === 'DISPOSED' ||
      dto.status === 'AVAILABLE' ||
      dto.status === 'IN_USE'
    ) {
      throw new BadRequestException(
        'Use the appropriate asset lifecycle operation to change this status.',
      );
    }

    return this.prisma.hospitalAsset.update({
      where: {
        id: assetId,
      },
      data: {
        name: dto.name,
        description: dto.description,
        condition: dto.condition,
        status: dto.status,
        locationDescription: dto.locationDescription,
        notes: dto.notes,
      },
    });
  }

  // --------------------------------------------------
  // 7. Transfer or assign asset
  // --------------------------------------------------

  async moveAsset(
    hospitalId: string,
    userId: string,
    assetId: string,
    dto: MoveAssetDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    await this.validateDepartment(
      hospitalId,
      dto.departmentId,
    );

    await this.validateWard(
      hospitalId,
      dto.wardId,
      dto.departmentId,
    );

    await this.validateStaffAssignment(
      hospitalId,
      dto.staffAssignmentId,
    );

    if (dto.wardId && !dto.departmentId) {
      throw new BadRequestException(
        'A department is required when assigning an asset to a ward.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const asset = await tx.hospitalAsset.findFirst({
            where: {
              id: assetId,
              hospitalId,
            },
          });

          if (!asset) {
            throw new NotFoundException(
              'Hospital asset not found.',
            );
          }

          if (
            asset.status === 'DISPOSED' ||
            asset.status === 'LOST'
          ) {
            throw new BadRequestException(
              'Lost or disposed assets cannot be transferred.',
            );
          }

          const movementType =
            asset.departmentId ||
            asset.wardId ||
            asset.assignedStaffAssignmentId
              ? AssetMovementType.TRANSFER
              : AssetMovementType.ASSIGNMENT;

          const updated = await tx.hospitalAsset.update({
            where: {
              id: asset.id,
            },
            data: {
              departmentId: dto.departmentId ?? null,
              wardId: dto.wardId ?? null,
              assignedStaffAssignmentId:
                dto.staffAssignmentId ?? null,
              status: dto.staffAssignmentId
                ? HospitalAssetStatus.IN_USE
                : HospitalAssetStatus.AVAILABLE,
            },
            include: {
              category: true,
              department: true,
              ward: true,
            },
          });

          await tx.assetMovement.create({
            data: {
              hospitalId,
              assetId: asset.id,
              movementType,
              fromDepartmentId: asset.departmentId,
              toDepartmentId: dto.departmentId,
              fromWardId: asset.wardId,
              toWardId: dto.wardId,
              fromStaffAssignmentId:
                asset.assignedStaffAssignmentId,
              toStaffAssignmentId: dto.staffAssignmentId,
              reason: dto.reason,
              notes: dto.notes,
              performedById: userId,
            },
          });

          return updated;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'The asset changed during this operation. Please retry.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 8. Mark asset as lost
  // --------------------------------------------------

  async markLost(
    hospitalId: string,
    userId: string,
    assetId: string,
    reason: string,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const asset = await this.prisma.hospitalAsset.findFirst({
      where: {
        id: assetId,
        hospitalId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Hospital asset not found.');
    }

    if (
      asset.status === 'DISPOSED' ||
      asset.status === 'LOST'
    ) {
      throw new ConflictException(
        'This asset is already lost or disposed.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hospitalAsset.update({
        where: { id: asset.id },
        data: {
          status: 'LOST',
          notes: reason,
        },
      });

      await tx.assetMovement.create({
        data: {
          hospitalId,
          assetId: asset.id,
          movementType: AssetMovementType.TRANSFER,
          fromDepartmentId: asset.departmentId,
          fromWardId: asset.wardId,
          fromStaffAssignmentId:
            asset.assignedStaffAssignmentId,
          reason: `Asset reported lost: ${reason}`,
          performedById: userId,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------
  // 9. Dispose asset
  // --------------------------------------------------

  async disposeAsset(
    hospitalId: string,
    userId: string,
    assetId: string,
    reason: string,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const asset = await this.prisma.hospitalAsset.findFirst({
      where: {
        id: assetId,
        hospitalId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Hospital asset not found.');
    }

    if (asset.status === 'DISPOSED') {
      throw new ConflictException(
        'This asset has already been disposed.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hospitalAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          status: 'DISPOSED',
          disposedAt: new Date(),
          disposalReason: reason,
          assignedStaffAssignmentId: null,
        },
      });

      await tx.assetMovement.create({
        data: {
          hospitalId,
          assetId: asset.id,
          movementType: AssetMovementType.DISPOSAL,
          fromDepartmentId: asset.departmentId,
          fromWardId: asset.wardId,
          fromStaffAssignmentId:
            asset.assignedStaffAssignmentId,
          reason,
          performedById: userId,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------
  // 10. Asset summary
  // --------------------------------------------------

  async getAssetSummary(hospitalId: string) {
    const grouped = await this.prisma.hospitalAsset.groupBy({
      by: ['status'],
      where: {
        hospitalId,
      },
      _count: {
        id: true,
      },
    });

    const total = grouped.reduce(
      (sum, item) => sum + item._count.id,
      0,
    );

    return {
      total,
      byStatus: grouped.map((item) => ({
        status: item.status,
        count: item._count.id,
      })),
    };
  }

  // --------------------------------------------------
  // 11. Movement history
  // --------------------------------------------------

  async getAssetMovements(
    hospitalId: string,
    assetId: string,
  ) {
    const asset = await this.prisma.hospitalAsset.findFirst({
      where: {
        id: assetId,
        hospitalId,
      },
      select: {
        id: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Hospital asset not found.');
    }

    return this.prisma.assetMovement.findMany({
      where: {
        hospitalId,
        assetId,
      },
      include: {
        performedBy: true,
      },
      orderBy: {
        performedAt: 'desc',
      },
    });
  }
}