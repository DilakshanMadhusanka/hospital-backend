import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { IpdService } from './ipd.service.js';

import { CreateAdmissionDto } from './dto/create-admission.dto.js';
import { AllocateBedDto } from './dto/allocate-bed.dto.js';
import { TransferBedDto } from './dto/transfer-bed.dto.js';
import { CreateObservationDto } from './dto/create-observation.dto.js';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto.js';
import { DischargePatientDto } from './dto/discharge-patient.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('ipd')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Post('admissions')
  @Permissions('ipd.admissions.create')
  createAdmission(
    @Body() dto: CreateAdmissionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.createAdmission(dto, user.id);
  }

  @Get('admissions')
  @Permissions('ipd.admissions.read')
  getAdmissions(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('status') status?: string,
  ) {
    return this.ipdService.getAdmissions(hospitalId, status);
  }

  @Get('admissions/:admissionId')
  @Permissions('ipd.admissions.read')
  getAdmissionDetails(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
  ) {
    return this.ipdService.getAdmissionDetails(admissionId);
  }

  @Post('admissions/:admissionId/allocate-bed')
  @Permissions('ipd.beds.allocate')
  allocateBed(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: AllocateBedDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.allocateBed(
      admissionId,
      dto,
      user.id,
    );
  }

  @Post('admissions/:admissionId/transfer-bed')
  @Permissions('ipd.beds.transfer')
  transferBed(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: TransferBedDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.transferBed(
      admissionId,
      dto,
      user.id,
    );
  }

  @Get('beds/available')
  @Permissions('ipd.beds.read')
  getAvailableBeds(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('wardId') wardId?: string,
  ) {
    return this.ipdService.getAvailableBeds(hospitalId, wardId);
  }

  @Post('admissions/:admissionId/observations')
  @Permissions('ipd.observations.create')
  createObservation(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: CreateObservationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.createObservation(
      admissionId,
      dto,
      user.id,
    );
  }

  @Post('admissions/:admissionId/nursing-notes')
  @Permissions('ipd.nursing-notes.create')
  createNursingNote(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: CreateNursingNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.createNursingNote(
      admissionId,
      dto,
      user.id,
    );
  }

  @Post('admissions/:admissionId/discharge')
  @Permissions('ipd.admissions.discharge')
  dischargePatient(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
    @Body() dto: DischargePatientDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ipdService.dischargePatient(
      admissionId,
      dto,
      user.id,
    );
  }

  @Get('admissions/:admissionId/clinical-records')
  @Permissions('ipd.clinical-records.read')
  getClinicalRecords(
    @Param('admissionId', ParseUUIDPipe) admissionId: string,
  ) {
    return this.ipdService.getClinicalRecords(admissionId);
  }
}