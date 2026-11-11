
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  BedStatus,
  IPDTransferStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateIPDTransferDto } from './dto/create-ipd-transfer.dto.js';
import { RejectIPDTransferDto } from './dto/reject-ipd-transfer.dto.js';
import { QueryIPDTransfersDto } from './dto/query-ipd-transfers.dto.js';

@Injectable()
export class IpdTransferService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyHospitalAccess(
    userId: string,
    hospitalId: string,
  ) {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        hospitalId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have access to this hospital.',
      );
    }
  }

  async createTransferRequest(
    hospitalId: string,
    userId: string,
    dto: CreateIPDTransferDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const admission = await this.prisma.iPDAdmission.findFirst({
      where: {
        id: dto.admissionId,
        hospitalId,
        status: 'ADMITTED',
      },
    });

    if (!admission) {
      throw new NotFoundException(
        'Active inpatient admission not found.',
      );
    }

    const currentAllocation =
      await this.prisma.iPDBedAllocation.findFirst({
        where: {
          admissionId: admission.id,
          releasedAt: null,
        },
        include: {
          bed: {
            include: {
              ward: true,
            },
          },
        },
      });

    if (!currentAllocation) {
      throw new ConflictException(
        'The admission does not have an active bed allocation.',
      );
    }

    const destinationWard = await this.prisma.ward.findFirst({
      where: {
        id: dto.toWardId,
        hospitalId,
      },
    });

    if (!destinationWard) {
      throw new NotFoundException(
        'Destination ward not found in this hospital.',
      );
    }

    const destinationBed = await this.prisma.bed.findFirst({
      where: {
        id: dto.toBedId,
        hospitalId,
        wardId: dto.toWardId,
      },
    });

    if (!destinationBed) {
      throw new NotFoundException(
        'Destination bed does not belong to the destination ward.',
      );
    }

    if (destinationBed.id === currentAllocation.bedId) {
      throw new BadRequestException(
        'The patient is already allocated to this bed.',
      );
    }

    if (destinationBed.status !== BedStatus.AVAILABLE) {
      throw new ConflictException(
        'Destination bed is not available.',
      );
    }

    const activeAllocation =
      await this.prisma.iPDBedAllocation.findFirst({
        where: {
          bedId: destinationBed.id,
          releasedAt: null,
        },
      });

    if (activeAllocation) {
      throw new ConflictException(
        'Destination bed already has an active allocation.',
      );
    }

    const existingRequest = await this.prisma.iPDTransfer.findFirst({
      where: {
        admissionId: admission.id,
        status: {
          in: [
            IPDTransferStatus.REQUESTED,
            IPDTransferStatus.APPROVED,
          ],
        },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'This admission already has a pending transfer.',
      );
    }

    return this.prisma.iPDTransfer.create({
      data: {
        admissionId: admission.id,
        hospitalId,
        fromWardId: currentAllocation.bed.wardId,
        toWardId: destinationWard.id,
        fromBedId: currentAllocation.bedId,
        toBedId: destinationBed.id,
        reason: dto.reason,
        clinicalNotes: dto.clinicalNotes,
        requestedById: userId,
        status: IPDTransferStatus.REQUESTED,
      },
      include: {
        fromWard: true,
        toWard: true,
        fromBed: true,
        toBed: true,
      },
    });
  }

  async getTransfers(
    hospitalId: string,
    userId: string,
    query: QueryIPDTransfersDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.prisma.iPDTransfer.findMany({
      where: {
        hospitalId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.wardId
          ? {
              OR: [
                { fromWardId: query.wardId },
                { toWardId: query.wardId },
              ],
            }
          : {}),
      },
      include: {
        fromWard: true,
        toWard: true,
        fromBed: true,
        toBed: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async getTransferById(
    transferId: string,
    hospitalId: string,
    userId: string,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    const transfer = await this.prisma.iPDTransfer.findFirst({
      where: {
        id: transferId,
        hospitalId,
      },
      include: {
        admission: true,
        fromWard: true,
        toWard: true,
        fromBed: true,
        toBed: true,
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer request not found.');
    }

    return transfer;
  }

  async approveTransfer(
    transferId: string,
    hospitalId: string,
    userId: string,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.runSerializable(async (tx) => {
      const transfer = await tx.iPDTransfer.findFirst({
        where: {
          id: transferId,
          hospitalId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer request not found.');
      }

      if (transfer.status !== IPDTransferStatus.REQUESTED) {
        throw new ConflictException(
          'Only requested transfers can be approved.',
        );
      }

      const admission = await tx.iPDAdmission.findFirst({
        where: {
          id: transfer.admissionId,
          hospitalId,
          status: 'ADMITTED',
        },
      });

      if (!admission) {
        throw new ConflictException(
          'The inpatient admission is no longer active.',
        );
      }

      const currentAllocation =
        await tx.iPDBedAllocation.findFirst({
          where: {
            admissionId: transfer.admissionId,
            releasedAt: null,
          },
        });

      if (!currentAllocation ||
          currentAllocation.bedId !== transfer.fromBedId) {
        throw new ConflictException(
          "The patient's current bed has changed. Create a new transfer request.",
        );
      }

      const destinationBed = await tx.bed.findFirst({
        where: {
          id: transfer.toBedId,
          hospitalId,
          wardId: transfer.toWardId,
        },
      });

      if (!destinationBed ||
          destinationBed.status !== BedStatus.AVAILABLE) {
        throw new ConflictException(
          'Destination bed is no longer available.',
        );
      }

      const allocation = await tx.iPDBedAllocation.findFirst({
        where: {
          bedId: transfer.toBedId,
          releasedAt: null,
        },
      });

      if (allocation) {
        throw new ConflictException(
          'Destination bed already has an active allocation.',
        );
      }

      const reserved = await tx.bed.updateMany({
        where: {
          id: transfer.toBedId,
          hospitalId,
          status: BedStatus.AVAILABLE,
        },
        data: {
          status: BedStatus.RESERVED,
        },
      });

      if (reserved.count !== 1) {
        throw new ConflictException(
          'Destination bed could not be reserved.',
        );
      }

      return tx.iPDTransfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: IPDTransferStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        },
      });
    });
  }

  async rejectTransfer(
    transferId: string,
    hospitalId: string,
    userId: string,
    dto: RejectIPDTransferDto,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.runSerializable(async (tx) => {
      const transfer = await tx.iPDTransfer.findFirst({
        where: {
          id: transferId,
          hospitalId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer request not found.');
      }

      if (transfer.status !== IPDTransferStatus.REQUESTED) {
        throw new ConflictException(
          'Only requested transfers can be rejected.',
        );
      }

      return tx.iPDTransfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: IPDTransferStatus.REJECTED,
          approvedById: userId,
          rejectedAt: new Date(),
          rejectionReason: dto.rejectionReason,
        },
      });
    });
  }

  async completeTransfer(
    transferId: string,
    hospitalId: string,
    userId: string,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.runSerializable(async (tx) => {
      const transfer = await tx.iPDTransfer.findFirst({
        where: {
          id: transferId,
          hospitalId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer request not found.');
      }

      if (transfer.status !== IPDTransferStatus.APPROVED) {
        throw new ConflictException(
          'Only approved transfers can be completed.',
        );
      }

      const currentAllocation =
        await tx.iPDBedAllocation.findFirst({
          where: {
            admissionId: transfer.admissionId,
            releasedAt: null,
          },
        });

      if (!currentAllocation ||
          currentAllocation.bedId !== transfer.fromBedId) {
        throw new ConflictException(
          "The patient's current bed allocation has changed.",
        );
      }

      const destinationAllocation =
        await tx.iPDBedAllocation.findFirst({
          where: {
            bedId: transfer.toBedId,
            releasedAt: null,
          },
        });

      if (destinationAllocation) {
        throw new ConflictException(
          'Destination bed already has an active allocation.',
        );
      }

      const destinationBed = await tx.bed.findFirst({
        where: {
          id: transfer.toBedId,
          hospitalId,
          wardId: transfer.toWardId,
          status: BedStatus.RESERVED,
        },
      });

      if (!destinationBed) {
        throw new ConflictException(
          'The reserved destination bed is no longer available.',
        );
      }

      const released = await tx.iPDBedAllocation.updateMany({
        where: {
          id: currentAllocation.id,
          releasedAt: null,
        },
        data: {
          releasedAt: new Date(),
          releasedById: userId,
        },
      });

      if (released.count !== 1) {
        throw new ConflictException(
          'Could not release the previous bed allocation.',
        );
      }

      await tx.bed.update({
        where: {
          id: transfer.fromBedId,
        },
        data: {
          status: BedStatus.AVAILABLE,
        },
      });

      await tx.bed.update({
        where: {
          id: transfer.toBedId,
        },
        data: {
          status: BedStatus.OCCUPIED,
        },
      });

      const newAllocation =
        await tx.iPDBedAllocation.create({
          data: {
            admissionId: transfer.admissionId,
            bedId: transfer.toBedId,
            allocatedById: userId,
            allocatedAt: new Date(),
          },
        });

      const completed = await tx.iPDTransfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: IPDTransferStatus.COMPLETED,
          completedById: userId,
          completedAt: new Date(),
        },
      });

      return {
        transfer: completed,
        previousBedId: transfer.fromBedId,
        newBedId: transfer.toBedId,
        allocation: newAllocation,
      };
    });
  }

  async cancelTransfer(
    transferId: string,
    hospitalId: string,
    userId: string,
  ) {
    await this.verifyHospitalAccess(userId, hospitalId);

    return this.runSerializable(async (tx) => {
      const transfer = await tx.iPDTransfer.findFirst({
        where: {
          id: transferId,
          hospitalId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer request not found.');
      }

      if (
        transfer.status !== IPDTransferStatus.REQUESTED &&
        transfer.status !== IPDTransferStatus.APPROVED
      ) {
        throw new ConflictException(
          'This transfer cannot be cancelled.',
        );
      }

      if (transfer.status === IPDTransferStatus.APPROVED) {
        const releasedReservation = await tx.bed.updateMany({
          where: {
            id: transfer.toBedId,
            hospitalId,
            status: BedStatus.RESERVED,
          },
          data: {
            status: BedStatus.AVAILABLE,
          },
        });

        if (releasedReservation.count !== 1) {
          throw new ConflictException(
            'The reserved destination bed has changed. Check bed occupancy before cancelling.',
          );
        }
      }

      return tx.iPDTransfer.update({
        where: {
          id: transfer.id,
        },
        data: {
          status: IPDTransferStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    });
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          operation,
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (retryable && attempt < 3) {
          continue;
        }

        if (retryable) {
          throw new ServiceUnavailableException(
            'The transfer could not be completed because of concurrent changes. Please retry.',
          );
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException(
      'Could not complete the transfer operation.',
    );
  }
}
