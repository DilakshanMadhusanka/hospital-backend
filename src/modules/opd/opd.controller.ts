import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { OpdService } from './opd.service.js';

import { RegisterOpdVisitDto } from './dto/register-opd-visit.dto.js';
import { AssignDoctorDto } from './dto/assign-doctor.dto.js';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto.js';
import { CreateConsultationDto } from './dto/create-consultation.dto.js';
import { CreateVitalSignsDto } from './dto/create-vital-signs.dto.js';
import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import { CreateInvestigationDto } from './dto/create-investigation.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateOpdVisitStatusDto } from './dto/update-opd-visit-status.dto.js';

@Controller('opd')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpdController {
  constructor(private readonly opdService: OpdService) {}

  // Register patient for OPD.
  @Post('visits')
  @Permissions('opd.register')
  registerVisit(@Body() dto: RegisterOpdVisitDto) {
    return this.opdService.registerVisit(dto);
  }

  // View today's department queue.
  @Get('queue')
  @Permissions('opd.queue.read')
  getQueue(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('departmentId', ParseUUIDPipe) departmentId: string,
    @Query('status') status?: string,
  ) {
    return this.opdService.getQueue(hospitalId, departmentId, status);
  }

  // Get visit details.
  @Get('visits/:visitId')
  @Permissions('opd.visits.read')
  getVisit(@Param('visitId', ParseUUIDPipe) visitId: string) {
    return this.opdService.getVisit(visitId);
  }

  // Assign doctor.
  @Patch('visits/:visitId/assign-doctor')
  @Permissions('opd.doctor.assign')
  assignDoctor(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: AssignDoctorDto,
  ) {
    return this.opdService.assignDoctor(visitId, dto);
  }

  // Change visit status.
  @Patch('visits/:visitId/status')
  @Permissions('opd.queue.manage')
  updateStatus(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateOpdVisitStatusDto,
  ) {
    return this.opdService.updateVisitStatus(visitId, dto.status);
  }

  // Create doctor schedule.
  @Post('doctor-schedules')
  @Permissions('opd.schedules.manage')
  createDoctorSchedule(@Body() dto: CreateDoctorScheduleDto) {
    return this.opdService.createDoctorSchedule(dto);
  }

  // Get department schedules.
  @Get('doctor-schedules')
  @Permissions('opd.schedules.read')
  getDoctorSchedules(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.opdService.getDoctorSchedules(hospitalId, departmentId);
  }

  // Save doctor's consultation.
  @Post('visits/:visitId/consultation')
  @Permissions('opd.consultation.manage')
  saveConsultation(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConsultationDto,
  ) {
    return this.opdService.saveConsultation(visitId, user.id, dto);
  }

  // Complete consultation.
  @Patch('visits/:visitId/complete-consultation')
  @Permissions('opd.consultation.manage')
  completeConsultation(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.opdService.completeConsultation(visitId, user.id);
  }

  // Record vital signs.
  @Post('visits/:visitId/vitals')
  @Permissions('opd.vitals.create')
  recordVitalSigns(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateVitalSignsDto,
  ) {
    return this.opdService.recordVitalSigns(visitId, user.id, dto);
  }

  // Create prescription.
  @Post('visits/:visitId/prescriptions')
  @Permissions('opd.prescriptions.create')
  createPrescription(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.opdService.createPrescription(visitId, user.id, dto);
  }

  // Request laboratory investigation.
  @Post('visits/:visitId/investigations')
  @Permissions('opd.investigations.create')
  requestInvestigation(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInvestigationDto,
  ) {
    return this.opdService.requestInvestigation(visitId, user.id, dto);
  }
}
