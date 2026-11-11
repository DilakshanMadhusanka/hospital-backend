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

import { LaboratoryService } from './laboratory.service.js';

import { CreateLabTestDto } from './dto/create-lab-test.dto.js';
import { CreateLabRequestDto } from './dto/create-lab-request.dto.js';
import { CollectSampleDto } from './dto/collect-sample.dto.js';
import { ReceiveSampleDto } from './dto/receive-sample.dto.js';
import { EnterLabResultDto } from './dto/enter-lab-result.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LaboratoryController {
  constructor(
    private readonly laboratoryService: LaboratoryService,
  ) {}

  // Test catalogue

  @Post('tests')
  @Permissions('lab.tests.manage')
  createLabTest(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Body() dto: CreateLabTestDto,
  ) {
    return this.laboratoryService.createLabTest(
      hospitalId,
      dto,
    );
  }

  @Get('tests')
  @Permissions('lab.tests.read')
  getLabTests(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.laboratoryService.getLabTests(hospitalId);
  }

  // Test requests

  @Post('requests')
  @Permissions('lab.requests.create')
  createLabRequest(
    @Body() dto: CreateLabRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.laboratoryService.createLabRequest(
      dto,
      user.id,
    );
  }

  @Get('requests')
  @Permissions('lab.requests.read')
  getLabRequests(
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
    @Query('status') status?: string,
  ) {
    return this.laboratoryService.getLabRequests(
      hospitalId,
      status,
    );
  }

  @Get('requests/:requestId')
  @Permissions('lab.requests.read')
  getLabRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.laboratoryService.getLabRequest(requestId);
  }

  // Specimen collection

  @Post('items/:itemId/collect-sample')
  @Permissions('lab.samples.collect')
  collectSample(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CollectSampleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.laboratoryService.collectSample(
      itemId,
      dto,
      user.id,
    );
  }

  @Post('items/:itemId/receive-sample')
  @Permissions('lab.samples.receive')
  receiveSample(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ReceiveSampleDto,
  ) {
    return this.laboratoryService.receiveSample(
      itemId,
      dto,
    );
  }

  // Result processing

  @Post('items/:itemId/results')
  @Permissions('lab.results.create')
  enterResult(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: EnterLabResultDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.laboratoryService.enterResult(
      itemId,
      dto,
      user.id,
    );
  }

  @Post('items/:itemId/verify-result')
  @Permissions('lab.results.verify')
  verifyResult(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.laboratoryService.verifyResult(
      itemId,
      user.id,
    );
  }

  // Patient reports

  @Get('patients/:patientId/reports')
  @Permissions('lab.reports.read')
  getPatientReports(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('hospitalId', ParseUUIDPipe) hospitalId: string,
  ) {
    return this.laboratoryService.getVerifiedPatientReports(
      patientId,
      hospitalId,
    );
  }
}