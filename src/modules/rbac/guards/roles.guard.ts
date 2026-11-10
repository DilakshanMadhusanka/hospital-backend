import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../database/prisma.service.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('Authenticated user not found');
    }

    const hospitalId =
      request.params?.hospitalId ??
      request.body?.hospitalId ??
      request.query?.hospitalId;

    const assignments = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [
          { hospitalId: null },
          ...(hospitalId ? [{ hospitalId }] : []),
        ],
      },
      include: {
        role: true,
      },
    });

    const assignedRoles = assignments.map(
      (assignment) => assignment.role.name,
    );

    const hasRole = requiredRoles.some((role) =>
      assignedRoles.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role privileges');
    }

    return true;
  }
}