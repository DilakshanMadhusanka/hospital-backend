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

import { PatientsService } from './patients.service.js';

import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
  ) {}

  @Post()
  @Permissions('patients.create')
  registerPatient(@Body() dto: CreatePatientDto) {
    return this.patientsService.registerPatient(dto);
  }

  @Get()
  @Permissions('patients.read')
  findAll(@Query() query: PatientQueryDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':patientId')
  @Permissions('patients.read')
  findOne(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.patientsService.findOne(patientId, hospitalId);
  }

  @Patch(':patientId')
  @Permissions('patients.update')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(
      patientId,
      hospitalId,
      dto,
    );
  }
}