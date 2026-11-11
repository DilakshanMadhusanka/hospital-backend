import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { PharmacyService } from './pharmacy.service.js';

import { CreateMedicineDto } from './dto/create-medicine.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { ReceiveStockDto } from './dto/receive-stock.dto.js';
import { DispensePrescriptionDto } from './dto/dispense-prescription.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
  ) {}

  // Medicines

  @Post('medicines')
  @Permissions('pharmacy.medicines.manage')
  createMedicine(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateMedicineDto,
  ) {
    return this.pharmacyService.createMedicine(hospitalId, dto);
  }

  @Get('medicines')
  @Permissions('pharmacy.medicines.read')
  getMedicines(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.pharmacyService.getMedicines(hospitalId);
  }

  // Suppliers

  @Post('suppliers')
  @Permissions('pharmacy.suppliers.manage')
  createSupplier(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.pharmacyService.createSupplier(hospitalId, dto);
  }

  @Get('suppliers')
  @Permissions('pharmacy.suppliers.read')
  getSuppliers(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.pharmacyService.getSuppliers(hospitalId);
  }

  // Purchase orders

  @Post('purchase-orders')
  @Permissions('pharmacy.purchase-orders.create')
  createPurchaseOrder(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.pharmacyService.createPurchaseOrder(
      hospitalId,
      dto,
      user.id,
    );
  }

  @Post('purchase-orders/:orderId/receive')
  @Permissions('pharmacy.stock.receive')
  receiveStock(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ReceiveStockDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.pharmacyService.receiveStock(
      hospitalId,
      orderId,
      dto,
      user.id,
    );
  }

  // Inventory

  @Get('inventory')
  @Permissions('pharmacy.inventory.read')
  getInventory(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.pharmacyService.getInventory(hospitalId);
  }

  @Get('inventory/low-stock')
  @Permissions('pharmacy.inventory.read')
  getLowStock(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.pharmacyService.getLowStock(hospitalId);
  }

  @Get('inventory/expiring')
  @Permissions('pharmacy.inventory.read')
  getExpiringBatches(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('days', new ParseIntPipe({ optional: true })) days = 90,
  ) {
    return this.pharmacyService.getExpiringBatches(
      hospitalId,
      days,
    );
  }

  // Prescription dispensing

  @Post('prescriptions/:prescriptionId/dispense')
  @Permissions('pharmacy.prescriptions.dispense')
  dispensePrescription(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: DispensePrescriptionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.pharmacyService.dispensePrescription(
      hospitalId,
      prescriptionId,
      dto,
      user.id,
    );
  }

  @Get('prescriptions/:prescriptionId/dispensing-history')
  @Permissions('pharmacy.dispensing-history.read')
  getDispensingHistory(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
  ) {
    return this.pharmacyService.getDispensingHistory(
      hospitalId,
      prescriptionId,
    );
  }
}