import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RadiologyRequestStatus } from '@prisma/client';

import { RadiologyService } from './radiology.service.js';

import { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto.js';
import { QueryRadiologyRequestsDto } from './dto/query-radiology-requests.dto.js';
import { UpdateRadiologyRequestStatusDto } from './dto/update-radiology-request-status.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';

import { CreateRadiologyAppointmentDto } from './dto/create-radiology-appointment.dto.js';

import { QueryRadiologyAppointmentsDto } from './dto/query-radiology-appointments.dto.js';

import { UpdateRadiologyAppointmentStatusDto } from './dto/update-radiology-appointment-status.dto.js';

import { CreateRadiologyReportDto } from './dto/create-radiology-report.dto.js';
import { AmendRadiologyReportDto } from './dto/amend-radiology-report.dto.js';
import { CreateRadiologyImageDto } from './dto/create-radiology-image.dto.js';

@Controller('radiology')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RadiologyController {
  constructor(private readonly radiologyService: RadiologyService) {}

  @Post('requests')
  @Permissions('radiology.requests.create')
  createRequest(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRadiologyRequestDto,
  ) {
    return this.radiologyService.createRequest(hospitalId, user.id, dto);
  }

  @Get('requests')
  @Permissions('radiology.requests.read')
  getRequests(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Query() filters: QueryRadiologyRequestsDto,
  ) {
    return this.radiologyService.getRequests(hospitalId, user.id, filters);
  }

  @Get('requests/:requestId')
  @Permissions('radiology.requests.read')
  getRequestById(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('requestId') requestId: string,
  ) {
    return this.radiologyService.getRequestById(hospitalId, user.id, requestId);
  }

  @Patch('requests/:requestId/status')
  @Permissions('radiology.requests.manage')
  updateRequestStatus(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('requestId') requestId: string,
    @Body() dto: UpdateRadiologyRequestStatusDto,
  ) {
    return this.radiologyService.updateRequestStatus(
      hospitalId,
      user.id,
      requestId,
      dto.status as RadiologyRequestStatus,
    );
  }

  @Post('appointments')
  @Permissions('radiology.appointments.create')
  createAppointment(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRadiologyAppointmentDto,
  ) {
    return this.radiologyService.createAppointment(hospitalId, user.id, dto);
  }

  @Get('appointments')
  @Permissions('radiology.appointments.read')
  getAppointments(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Query() filters: QueryRadiologyAppointmentsDto,
  ) {
    return this.radiologyService.getAppointments(hospitalId, user.id, filters);
  }

  @Get('appointments/:appointmentId')
  @Permissions('radiology.appointments.read')
  getAppointmentById(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.radiologyService.getAppointmentById(
      hospitalId,
      user.id,
      appointmentId,
    );
  }

  @Patch('appointments/:appointmentId/status')
  @Permissions('radiology.appointments.manage')
  updateAppointmentStatus(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateRadiologyAppointmentStatusDto,
  ) {
    return this.radiologyService.updateAppointmentStatus(
      hospitalId,
      user.id,
      appointmentId,
      dto.status,
    );
  }

  @Post('reports')
  @Permissions('radiology.reports.create')
  createReport(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRadiologyReportDto,
  ) {
    return this.radiologyService.createReport(hospitalId, user.id, dto);
  }

  @Get('reports/:reportId')
  @Permissions('radiology.reports.read')
  getReport(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('reportId') reportId: string,
  ) {
    return this.radiologyService.getReport(hospitalId, user.id, reportId);
  }

  @Patch('reports/:reportId/verify')
  @Permissions('radiology.reports.verify')
  verifyReport(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('reportId') reportId: string,
  ) {
    return this.radiologyService.verifyReport(hospitalId, user.id, reportId);
  }

  @Post('reports/:reportId/amend')
  @Permissions('radiology.reports.amend')
  amendReport(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('reportId') reportId: string,
    @Body() dto: AmendRadiologyReportDto,
  ) {
    return this.radiologyService.amendReport(
      hospitalId,
      user.id,
      reportId,
      dto,
    );
  }

  @Post('images')
  @Permissions('radiology.images.manage')
  registerImage(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRadiologyImageDto,
  ) {
    return this.radiologyService.registerImage(hospitalId, user.id, dto);
  }
}
