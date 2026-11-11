import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';

import { CreateMedicineDto } from './dto/create-medicine.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';

@Injectable()
export class PharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  private generateNumber(prefix: string): string {
    const year = new Date().getFullYear();
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `${prefix}-${year}-${random}`;
  }

  // ---------------------------------------------
  // 1. CREATE MEDICINE
  // ---------------------------------------------

  async createMedicine(
    hospitalId: string,
    dto: CreateMedicineDto,
  ) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.medicine.create({
      data: {
        hospitalId,
        code: dto.code,
        name: dto.name,
        genericName: dto.genericName,
        brandName: dto.brandName,
        strength: dto.strength,
        dosageForm: dto.dosageForm,
        unit: dto.unit,
        reorderLevel: dto.reorderLevel ?? 10,
      },
    });
  }

  // ---------------------------------------------
  // 2. LIST MEDICINES
  // ---------------------------------------------

  async getMedicines(hospitalId: string) {
    return this.prisma.medicine.findMany({
      where: {
        hospitalId,
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------
  // 3. CREATE SUPPLIER
  // ---------------------------------------------

  async createSupplier(
    hospitalId: string,
    dto: CreateSupplierDto,
  ) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    return this.prisma.supplier.create({
      data: {
        hospitalId,
        code: dto.code,
        name: dto.name,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
      },
    });
  }

  async getSuppliers(hospitalId: string) {
    return this.prisma.supplier.findMany({
      where: {
        hospitalId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------
  // 4. CREATE PURCHASE ORDER
  // ---------------------------------------------

  async createPurchaseOrder(
    hospitalId: string,
    dto: CreatePurchaseOrderDto,
    userId: string,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: dto.supplierId,
        hospitalId,
        isActive: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Active supplier not found in this hospital',
      );
    }

    const medicineIds = dto.items.map((item) => item.medicineId);

    if (new Set(medicineIds).size !== medicineIds.length) {
      throw new BadRequestException(
        'Duplicate medicines are not allowed in one purchase order',
      );
    }

    const medicines = await this.prisma.medicine.findMany({
      where: {
        id: { in: medicineIds },
        hospitalId,
        status: 'ACTIVE',
      },
    });

    if (medicines.length !== medicineIds.length) {
      throw new BadRequestException(
        'One or more medicines are invalid or inactive',
      );
    }

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber: this.generateNumber('PO'),
        hospitalId,
        supplierId: dto.supplierId,
        createdById: userId,
        expectedDate: dto.expectedDate
          ? new Date(dto.expectedDate)
          : undefined,
        notes: dto.notes,
        status: 'ORDERED',
        items: {
          create: dto.items.map((item) => ({
            medicineId: item.medicineId,
            orderedQuantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: { medicine: true },
        },
      },
    });
  }

  // ---------------------------------------------
  // 5. RECEIVE PURCHASE ORDER STOCK
  // ---------------------------------------------

  async receiveStock(
    hospitalId: string,
    orderId: string,
    dto: ReceiveStockDto,
    userId: string,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: {
        id: orderId,
        hospitalId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found');
    }

    if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new BadRequestException(
        'This purchase order cannot receive more stock',
      );
    }

    const itemIds = dto.items.map((item) => item.purchaseOrderItemId);

    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException(
        'A purchase order item can only appear once per receiving request',
      );
    }

    // Validate all requested lines before writing.
    for (const line of dto.items) {
      const orderItem = order.items.find(
        (item) => item.id === line.purchaseOrderItemId,
      );

      if (!orderItem) {
        throw new BadRequestException(
          'Purchase order item does not belong to this order',
        );
      }

      if (
        orderItem.receivedQuantity + line.quantity >
        orderItem.orderedQuantity
      ) {
        throw new BadRequestException(
          'Received quantity cannot exceed the ordered quantity',
        );
      }

      const expiry = new Date(line.expiryDate);

      if (
        Number.isNaN(expiry.getTime()) ||
        expiry.getTime() <= Date.now()
      ) {
        throw new BadRequestException(
          'Expiry date must be in the future',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of dto.items) {
        const orderItem = order.items.find(
          (item) => item.id === line.purchaseOrderItemId,
        )!;

        const updatedItem = await tx.purchaseOrderItem.updateMany({
          where: {
            id: orderItem.id,
            receivedQuantity: orderItem.receivedQuantity,
            orderedQuantity: { gte: orderItem.receivedQuantity + line.quantity },
          },
          data: {
            receivedQuantity: { increment: line.quantity },
          },
        });

        if (updatedItem.count !== 1) {
          throw new ConflictException(
            'Purchase order quantity changed. Refresh and try again.',
          );
        }

        const batch = await tx.medicineBatch.upsert({
          where: {
            hospitalId_medicineId_batchNumber: {
              hospitalId,
              medicineId: orderItem.medicineId,
              batchNumber: line.batchNumber,
            },
          },
          create: {
            hospitalId,
            medicineId: orderItem.medicineId,
            batchNumber: line.batchNumber,
            expiryDate: new Date(line.expiryDate),
            quantity: line.quantity,
            unitCost: line.unitCost ?? orderItem.unitCost,
          },
          update: {
            // Existing batches must have matching expiry and cost.
            // Never silently combine different batches.
            quantity: { increment: line.quantity },
          },
        });

        if (
          batch.expiryDate.toISOString().slice(0, 10) !==
          new Date(line.expiryDate).toISOString().slice(0, 10)
        ) {
          throw new BadRequestException(
            'The existing batch has a different expiry date',
          );
        }

        await tx.stockMovement.create({
          data: {
            hospitalId,
            medicineId: orderItem.medicineId,
            batchId: batch.id,
            type: 'PURCHASE',
            quantity: line.quantity,
            balanceAfter: batch.quantity,
            reference: order.orderNumber,
            reason: 'Purchase order goods received',
            performedById: userId,
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });

      const allReceived = refreshedItems.every(
        (item) => item.receivedQuantity === item.orderedQuantity,
      );

      const anyReceived = refreshedItems.some(
        (item) => item.receivedQuantity > 0,
      );

      return tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: allReceived
            ? 'RECEIVED'
            : anyReceived
              ? 'PARTIALLY_RECEIVED'
              : 'ORDERED',
        },
        include: { items: true, supplier: true },
      });
    });
  }

  // ---------------------------------------------
  // 6. INVENTORY SUMMARY
  // ---------------------------------------------

  async getInventory(hospitalId: string) {
    const medicines = await this.prisma.medicine.findMany({
      where: {
        hospitalId,
        status: 'ACTIVE',
      },
      include: {
        batches: {
          where: {
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return medicines.map((medicine) => {
      const totalStock = medicine.batches.reduce(
        (sum, batch) => sum + batch.quantity,
        0,
      );

      return {
        medicineId: medicine.id,
        code: medicine.code,
        name: medicine.name,
        strength: medicine.strength,
        unit: medicine.unit,
        totalStock,
        reorderLevel: medicine.reorderLevel,
        lowStock: totalStock <= medicine.reorderLevel,
        batches: medicine.batches,
      };
    });
  }

  // ---------------------------------------------
  // 7. LOW STOCK REPORT
  // ---------------------------------------------

  async getLowStock(hospitalId: string) {
    const inventory = await this.getInventory(hospitalId);

    return inventory.filter((item) => item.lowStock);
  }

  // ---------------------------------------------
  // 8. EXPIRING BATCH REPORT
  // ---------------------------------------------

  async getExpiringBatches(
    hospitalId: string,
    days = 90,
  ) {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new BadRequestException(
        'Days must be between 1 and 365',
      );
    }

    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    return this.prisma.medicineBatch.findMany({
      where: {
        hospitalId,
        quantity: { gt: 0 },
        expiryDate: {
          gt: now,
          lte: until,
        },
      },
      include: {
        medicine: true,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ---------------------------------------------
  // 9. DISPENSE PRESCRIPTION
  // ---------------------------------------------

  async dispensePrescription(
    hospitalId: string,
    prescriptionId: string,
    dto: DispensePrescriptionDto,
    userId: string,
  ) {
    const prescription = await this.prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        visit: {
          hospitalId,
        },
        status: {
          in: ['ACTIVE', 'PARTIALLY_DISPENSED'],
        },
      },
      include: {
        items: true,
        visit: {
          select: {
            id: true,
            hospitalId: true,
            patientId: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException(
        'Active prescription not found in this hospital',
      );
    }

    if (prescription.items.length === 0) {
      throw new BadRequestException(
        'Prescription has no medicine items',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const dispense = await tx.pharmacyDispense.create({
        data: {
          dispenseNumber: this.generateNumber('DISP'),
          hospitalId,
          prescriptionId,
          dispensedById: userId,
          notes: dto.notes,
          status: 'COMPLETED',
        },
      });

      for (const item of prescription.items) {
        const alreadyDispensed = await tx.pharmacyDispenseItem.aggregate({
          where: {
            prescriptionItemId: item.id,
            dispense: {
              status: 'COMPLETED',
            },
          },
          _sum: { quantity: true },
        });

        const remaining =
          item.quantity - (alreadyDispensed._sum.quantity ?? 0);

        if (remaining < 0) {
          throw new ConflictException(
            'Previously dispensed quantity exceeds prescription quantity',
          );
        }

        if (remaining === 0) {
          continue;
        }

        const batches = await tx.medicineBatch.findMany({
          where: {
            hospitalId,
            medicine: {
              status: 'ACTIVE',
              OR: [
                { name: { equals: item.medicineName, mode: 'insensitive' } },
                { genericName: { equals: item.medicineName, mode: 'insensitive' } },
              ],
            },
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          orderBy: [
            { expiryDate: 'asc' },
            { createdAt: 'asc' },
          ],
        });

        const available = batches.reduce(
          (sum, batch) => sum + batch.quantity,
          0,
        );

        if (available < remaining) {
          throw new BadRequestException(
            `Insufficient stock for ${item.medicineName}. Required: ${remaining}, available: ${available}`,
          );
        }

        let quantityToDispense = remaining;

        for (const batch of batches) {
          if (quantityToDispense === 0) break;

          const quantity = Math.min(
            batch.quantity,
            quantityToDispense,
          );

          const updated = await tx.medicineBatch.updateMany({
            where: {
              id: batch.id,
              hospitalId,
              quantity: { gte: quantity },
              expiryDate: { gt: new Date() },
            },
            data: {
              quantity: { decrement: quantity },
            },
          });

          if (updated.count !== 1) {
            throw new ConflictException(
              'Stock changed during dispensing. Please retry.',
            );
          }

          const updatedBatch = await tx.medicineBatch.findUniqueOrThrow({
            where: { id: batch.id },
          });

          await tx.pharmacyDispenseItem.create({
            data: {
              dispenseId: dispense.id,
              prescriptionItemId: item.id,
              medicineId: batch.medicineId,
              batchId: batch.id,
              quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              hospitalId,
              medicineId: batch.medicineId,
              batchId: batch.id,
              type: 'DISPENSE',
              quantity: -quantity,
              balanceAfter: updatedBatch.quantity,
              reference: dispense.dispenseNumber,
              reason: 'Prescription dispensing',
              performedById: userId,
            },
          });

          quantityToDispense -= quantity;
        }
      }

      // Recalculate whether every prescription item has been fully dispensed.
      const updatedPrescription = await tx.prescription.findUniqueOrThrow({
        where: { id: prescriptionId },
        include: { items: true },
      });

      let fullyDispensed = true;
      let anyDispensed = false;

      for (const item of updatedPrescription.items) {
        const totals = await tx.pharmacyDispenseItem.aggregate({
          where: {
            prescriptionItemId: item.id,
            dispense: { status: 'COMPLETED' },
          },
          _sum: { quantity: true },
        });

        const dispensed = totals._sum.quantity ?? 0;

        if (dispensed > 0) anyDispensed = true;
        if (dispensed < item.quantity) fullyDispensed = false;
      }

      await tx.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: fullyDispensed
            ? 'DISPENSED'
            : anyDispensed
              ? 'PARTIALLY_DISPENSED'
              : 'ACTIVE',
        },
      });

      return tx.pharmacyDispense.findUnique({
        where: { id: dispense.id },
        include: {
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
        },
      });
    });
  }

  // ---------------------------------------------
  // 10. DISPENSING HISTORY
  // ---------------------------------------------

  async getDispensingHistory(
    hospitalId: string,
    prescriptionId: string,
  ) {
    return this.prisma.pharmacyDispense.findMany({
      where: {
        hospitalId,
        prescriptionId,
      },
      orderBy: { dispensedAt: 'desc' },
      include: {
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
      },
    });
  }
}