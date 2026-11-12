import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MaintenanceRequestType,
  MaintenanceStatus,
  MaintenanceWorkType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto.js';
import { ChangeMaintenanceStatusDto } from './dto/change-maintenance-status.dto.js';
import { CreateMaintenanceWorkLogDto } from './dto/create-maintenance-work-log.dto.js';
import { CreateMaintenancePartDto } from './dto/create-maintenance-part.dto.js';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto.js';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalMembership(userId: string, hospitalId: string) {
    const membership = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this hospital.');
    }
  }

  private async verifyHospitalAdmin(userId: string, hospitalId: string) {
    const admin = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
        role: {
          name: 'HOSPITAL_ADMIN',
        },
      },
    });

    if (!admin) {
      throw new ForbiddenException(
        'Only hospital administrators can perform this operation.',
      );
    }
  }

  private async getRequest(requestId: string, hospitalId: string) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: {
        id: requestId,
        hospitalId,
      },
      include: {
        asset: true,
        department: true,
        ward: true,
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        workLogs: {
          include: {
            performedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            performedAt: 'desc',
          },
        },
        parts: true,
        statusHistory: {
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    return request;
  }

  // --------------------------------------------------
  // 1. CREATE MAINTENANCE REQUEST
  // --------------------------------------------------

  async createRequest(
    userId: string,
    hospitalId: string,
    dto: CreateMaintenanceRequestDto,
  ) {
    await this.verifyHospitalMembership(userId, hospitalId);

    if (dto.requestType === MaintenanceRequestType.ASSET && !dto.assetId) {
      throw new BadRequestException(
        'An asset must be selected for an asset maintenance request.',
      );
    }

    if (dto.requestType === MaintenanceRequestType.FACILITY && dto.assetId) {
      throw new BadRequestException(
        'Facility maintenance requests cannot reference an asset.',
      );
    }

    if (dto.assetId) {
      const asset = await this.prisma.hospitalAsset.findFirst({
        where: {
          id: dto.assetId,
          hospitalId,
        },
      });

      if (!asset) {
        throw new BadRequestException(
          'The selected asset does not belong to this hospital.',
        );
      }
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          hospitalId,
        },
      });

      if (!department) {
        throw new BadRequestException('Invalid department for this hospital.');
      }
    }

    if (dto.wardId) {
      const ward = await this.prisma.ward.findFirst({
        where: {
          id: dto.wardId,
          hospitalId,
          ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
        },
      });

      if (!ward) {
        throw new BadRequestException(
          'Invalid ward for this hospital or department.',
        );
      }
    }

    const requestNumber = `MR-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.maintenanceRequest.create({
          data: {
            hospitalId,
            requestNumber,
            requestType: dto.requestType,
            assetId: dto.assetId,
            departmentId: dto.departmentId,
            wardId: dto.wardId,
            title: dto.title,
            description: dto.description,
            locationDescription: dto.locationDescription,
            priority: dto.priority ?? 'MEDIUM',
            estimatedCost: dto.estimatedCost
              ? new Prisma.Decimal(dto.estimatedCost)
              : undefined,
            reportedById: userId,
          },
        });

        await tx.maintenanceStatusHistory.create({
          data: {
            maintenanceRequestId: request.id,
            previousStatus: null,
            newStatus: MaintenanceStatus.REPORTED,
            changedById: userId,
            reason: 'Maintenance request submitted.',
          },
        });

        return request;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A maintenance request with this number already exists. Please retry.',
        );
      }

      throw error;
    }
  }

  // --------------------------------------------------
  // 2. GET MAINTENANCE REQUESTS
  // --------------------------------------------------

  async getRequests(
    userId: string,
    hospitalId: string,
    query: QueryMaintenanceDto,
  ) {
    await this.verifyHospitalMembership(userId, hospitalId);

    return this.prisma.maintenanceRequest.findMany({
      where: {
        hospitalId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.assetId ? { assetId: query.assetId } : {}),
      },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { reportedAt: 'desc' }],
      take: 200,
    });
  }

  async getRequestById(userId: string, hospitalId: string, requestId: string) {
    await this.verifyHospitalMembership(userId, hospitalId);

    return this.getRequest(requestId, hospitalId);
  }

  // --------------------------------------------------
  // 3. REVIEW / APPROVE REQUEST
  // --------------------------------------------------

  async approveRequest(userId: string, hospitalId: string, requestId: string) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    return this.changeStatus(
      userId,
      hospitalId,
      requestId,
      MaintenanceStatus.APPROVED,
      'Maintenance request approved.',
    );
  }

  async rejectRequest(
    userId: string,
    hospitalId: string,
    requestId: string,
    reason: string,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    if (!reason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const request = await this.getRequest(requestId, hospitalId);

    const rejectableStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.REPORTED,
      MaintenanceStatus.UNDER_REVIEW,
    ];

    if (!rejectableStatuses.includes(request.status)) {
      throw new ConflictException(
        'Only reported or under-review requests can be rejected.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: MaintenanceStatus.REJECTED,
          reviewedById: userId,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceRequestId: requestId,
          previousStatus: request.status,
          newStatus: MaintenanceStatus.REJECTED,
          changedById: userId,
          reason,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------
  // 4. ASSIGN TECHNICIAN
  // --------------------------------------------------

  async assignTechnician(
    userId: string,
    hospitalId: string,
    requestId: string,
    dto: AssignMaintenanceDto,
  ) {
    await this.verifyHospitalAdmin(userId, hospitalId);

    const request = await this.getRequest(requestId, hospitalId);

    const assignableStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.APPROVED,
      MaintenanceStatus.ASSIGNED,
    ];

    if (!assignableStatuses.includes(request.status)) {
      throw new ConflictException(
        'Approve the request before assigning a technician.',
      );
    }

    const technician = await this.prisma.userRole.findFirst({
      where: {
        userId: dto.assignedToId,
        hospitalId,
      },
    });

    if (!technician) {
      throw new BadRequestException(
        'The selected technician does not have access to this hospital.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          assignedToId: dto.assignedToId,
          assignedAt: new Date(),
          status: MaintenanceStatus.ASSIGNED,
        },
      });

      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceRequestId: requestId,
          previousStatus: request.status,
          newStatus: MaintenanceStatus.ASSIGNED,
          changedById: userId,
          reason: dto.reason ?? 'Technician assigned.',
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------
  // 5. STATUS MANAGEMENT
  // --------------------------------------------------

  private async changeStatus(
    userId: string,
    hospitalId: string,
    requestId: string,
    newStatus: MaintenanceStatus,
    reason: string,
  ) {
    const request = await this.getRequest(requestId, hospitalId);

    if (request.status !== MaintenanceStatus.REPORTED) {
      throw new ConflictException(
        'This request is no longer in the reported state.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          reviewedById: userId,
        },
      });

      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceRequestId: requestId,
          previousStatus: request.status,
          newStatus,
          changedById: userId,
          reason,
        },
      });

      return updated;
    });
  }

  async changeRequestStatus(
    userId: string,
    hospitalId: string,
    requestId: string,
    dto: ChangeMaintenanceStatusDto,
  ) {
    const request = await this.getRequest(requestId, hospitalId);

    const isAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
        role: { name: 'HOSPITAL_ADMIN' },
      },
    });

    if (!isAdmin && request.assignedToId !== userId) {
      throw new ForbiddenException(
        'Only the hospital administrator or assigned technician can update this request.',
      );
    }

    const allowedTransitions: Record<string, MaintenanceStatus[]> = {
      [MaintenanceStatus.ASSIGNED]: [
        MaintenanceStatus.IN_PROGRESS,
        MaintenanceStatus.ON_HOLD,
        MaintenanceStatus.CANCELLED,
      ],
      [MaintenanceStatus.IN_PROGRESS]: [
        MaintenanceStatus.ON_HOLD,
        MaintenanceStatus.COMPLETED,
      ],
      [MaintenanceStatus.ON_HOLD]: [
        MaintenanceStatus.IN_PROGRESS,
        MaintenanceStatus.CANCELLED,
      ],
    };

    if (!allowedTransitions[request.status]?.includes(dto.status)) {
      throw new ConflictException(
        `Cannot change maintenance status from ${request.status} to ${dto.status}.`,
      );
    }

    if (dto.status === MaintenanceStatus.COMPLETED && !dto.reason?.trim()) {
      throw new BadRequestException(
        'Provide a completion summary when completing maintenance.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          ...(dto.status === MaintenanceStatus.IN_PROGRESS
            ? { startedAt: new Date() }
            : {}),
          ...(dto.status === MaintenanceStatus.COMPLETED
            ? {
                completedAt: new Date(),
                resolutionSummary: dto.reason,
              }
            : {}),
        },
      });

      await tx.maintenanceStatusHistory.create({
        data: {
          maintenanceRequestId: requestId,
          previousStatus: request.status,
          newStatus: dto.status,
          changedById: userId,
          reason: dto.reason,
        },
      });

      // Only change an asset that is currently under maintenance.
      // Do not automatically make an out-of-service asset available.
      if (request.assetId && dto.status === MaintenanceStatus.IN_PROGRESS) {
        await tx.hospitalAsset.updateMany({
          where: {
            id: request.assetId,
            hospitalId,
            status: 'AVAILABLE',
          },
          data: {
            status: 'UNDER_MAINTENANCE',
          },
        });
      }

      if (request.assetId && dto.status === MaintenanceStatus.COMPLETED) {
        await tx.hospitalAsset.updateMany({
          where: {
            id: request.assetId,
            hospitalId,
            status: 'UNDER_MAINTENANCE',
          },
          data: {
            status: 'AVAILABLE',
          },
        });
      }

      return updated;
    });
  }

  // --------------------------------------------------
  // 6. ADD WORK LOG
  // --------------------------------------------------

  async addWorkLog(
    userId: string,
    hospitalId: string,
    requestId: string,
    dto: CreateMaintenanceWorkLogDto,
  ) {
    const request = await this.getRequest(requestId, hospitalId);

    await this.verifyAssignedTechnicianOrAdmin(
      userId,
      hospitalId,
      request.assignedToId,
    );

    const activeStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.IN_PROGRESS,
      MaintenanceStatus.ON_HOLD,
    ];

    if (!activeStatuses.includes(request.status)) {
      throw new ConflictException(
        'Work logs can only be recorded for active maintenance.',
      );
    }

    return this.prisma.maintenanceWorkLog.create({
      data: {
        maintenanceRequestId: requestId,
        performedById: userId,
        workType: dto.workType,
        description: dto.description,
        findings: dto.findings,
        hoursSpent: dto.hoursSpent,
      },
    });
  }

  // --------------------------------------------------
  // 7. ADD PARTS AND MATERIALS
  // --------------------------------------------------

  async addPart(
    userId: string,
    hospitalId: string,
    requestId: string,
    dto: CreateMaintenancePartDto,
  ) {
    const request = await this.getRequest(requestId, hospitalId);

    await this.verifyAssignedTechnicianOrAdmin(
      userId,
      hospitalId,
      request.assignedToId,
    );

    const activeStatuses: MaintenanceStatus[] = [
      MaintenanceStatus.IN_PROGRESS,
      MaintenanceStatus.ON_HOLD,
    ];

    if (!activeStatuses.includes(request.status)) {
      throw new ConflictException(
        'Parts can only be added to active maintenance requests.',
      );
    }

    const totalCost = Number((dto.quantity * dto.unitCost).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const part = await tx.maintenancePart.create({
        data: {
          maintenanceRequestId: requestId,
          partName: dto.partName,
          partType: dto.partType,
          quantity: dto.quantity,
          unit: dto.unit,
          unitCost: dto.unitCost,
          totalCost,
          notes: dto.notes,
        },
      });

      const parts = await tx.maintenancePart.findMany({
        where: { maintenanceRequestId: requestId },
        select: { totalCost: true },
      });

      const partsTotal = parts.reduce(
        (sum, item) => sum + Number(item.totalCost),
        0,
      );

      await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: {
          actualCost: partsTotal,
        },
      });

      return part;
    });
  }

  // --------------------------------------------------
  // 8. DASHBOARD SUMMARY
  // --------------------------------------------------

  async getSummary(userId: string, hospitalId: string) {
    await this.verifyHospitalMembership(userId, hospitalId);

    const grouped = await this.prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { hospitalId },
      _count: { id: true },
    });

    const result = Object.values(MaintenanceStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const item of grouped) {
      result[item.status] = item._count.id;
    }

    const criticalOpen = await this.prisma.maintenanceRequest.count({
      where: {
        hospitalId,
        priority: 'CRITICAL',
        status: {
          notIn: [
            MaintenanceStatus.COMPLETED,
            MaintenanceStatus.REJECTED,
            MaintenanceStatus.CANCELLED,
          ],
        },
      },
    });

    return {
      totalRequests: grouped.reduce((sum, item) => sum + item._count.id, 0),
      byStatus: result,
      criticalOpen,
    };
  }

  private async verifyAssignedTechnicianOrAdmin(
    userId: string,
    hospitalId: string,
    assignedToId: string | null,
  ) {
    if (assignedToId === userId) {
      return;
    }

    const isAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
        role: {
          name: 'HOSPITAL_ADMIN',
        },
      },
    });

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only the assigned technician or a hospital administrator can perform this operation.',
      );
    }
  }
}
