import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: {
        code: 'asc',
      },
    });
  }

  async createRole(dto: CreateRoleDto) {
    const name = dto.name.trim().toUpperCase();

    const existing = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Role already exists');
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: dto.permissions,
        },
      },
    });

    if (permissions.length !== new Set(dto.permissions).size) {
      throw new BadRequestException(
        'One or more permission codes do not exist',
      );
    }

    return this.prisma.role.create({
      data: {
        name,
        description: dto.description,
        isSystem: false,
        rolePermissions: {
          create: permissions.map((permission) => ({
            permission: {
              connect: { id: permission.id },
            },
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async assignRole(dto: AssignRoleDto) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.userId },
      }),
      this.prisma.role.findUnique({
        where: { id: dto.roleId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Cannot assign a role to an inactive user');
    }

    if (dto.hospitalId) {
      const hospital = await this.prisma.hospital.findUnique({
        where: { id: dto.hospitalId },
      });

      if (!hospital) {
        throw new NotFoundException('Hospital not found');
      }
    }

    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.userId,
        roleId: dto.roleId,
        hospitalId: dto.hospitalId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException('Role already assigned');
    }

    return this.prisma.userRole.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        hospitalId: dto.hospitalId ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: true,
        hospital: true,
      },
    });
  }

  async getUserRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        hospital: true,
      },
    });
  }

  async removeRoleAssignment(assignmentId: string) {
    const assignment = await this.prisma.userRole.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.userRole.delete({
      where: { id: assignmentId },
    });

    return {
      message: 'Role assignment removed successfully',
    };
  }
}