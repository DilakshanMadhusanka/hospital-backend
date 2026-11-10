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

import { CreateAddressDto } from './dto/create-address.dto.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { CreateMedicalHistoryDto } from './dto/create-medical-history.dto.js';
import { CreateAllergyDto } from './dto/create-allergy.dto.js';

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

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
    return this.patientsService.update(patientId, hospitalId, dto);
  }

  @Post(':patientId/addresses')
  @Permissions('patients.update')
  addAddress(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.patientsService.addAddress(patientId, hospitalId, dto);
  }

  @Post(':patientId/contacts')
  @Permissions('patients.update')
  addContact(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.patientsService.addContact(patientId, hospitalId, dto);
  }

  @Post(':patientId/medical-history')
  @Permissions('medical_records.create')
  addMedicalHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateMedicalHistoryDto,
  ) {
    return this.patientsService.addMedicalHistory(patientId, hospitalId, dto);
  }

  @Post(':patientId/allergies')
  @Permissions('medical_records.create')
  addAllergy(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.patientsService.addAllergy(patientId, hospitalId, dto);
  }

  @Get(':patientId/clinical-information')
  @Permissions('medical_records.read')
  getClinicalInformation(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.patientsService.getPatientClinicalInformation(
      patientId,
      hospitalId,
    );
  }
}
