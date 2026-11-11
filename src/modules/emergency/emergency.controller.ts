import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';

import { AssignEmergencyStaffDto } from './dto/assign-emergency-staff.dto.js';
import { QueryEmergencyQueueDto } from './dto/query-emergency-queue.dto.js';

import { EmergencyService } from './emergency.service.js';

import { CreateEmergencyEncounterDto } from './dto/create-emergency-encounter.dto.js';
import { CreateEmergencyTriageDto } from './dto/create-emergency-triage.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('emergency')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('encounters')
  @Permissions('emergency.encounters.create')
  createEncounter(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEmergencyEncounterDto,
  ) {
    return this.emergencyService.createEncounter(hospitalId, user.id, dto);
  }

  @Post('triage')
  @Permissions('emergency.triage.create')
  createTriage(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateEmergencyTriageDto,
  ) {
    return this.emergencyService.createTriage(hospitalId, user.id, dto);
  }

  @Get('encounters/:encounterId')
  @Permissions('emergency.encounters.read')
  getEncounter(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('encounterId') encounterId: string,
  ) {
    return this.emergencyService.getEncounter(hospitalId, user.id, encounterId);
  }

  @Get('queue')
  @Permissions('emergency.queue.read')
  getEmergencyQueue(
    @Query('hospitalId') hospitalId: string,
    @Query() query: QueryEmergencyQueueDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.emergencyService.getEmergencyQueue(hospitalId, user.id, query);
  }

  @Patch('encounters/:encounterId/assign-staff')
  @Permissions('emergency.staff.assign')
  assignEmergencyStaff(
    @Query('hospitalId') hospitalId: string,
    @Param('encounterId') encounterId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AssignEmergencyStaffDto,
  ) {
    return this.emergencyService.assignEmergencyStaff(
      hospitalId,
      user.id,
      encounterId,
      dto,
    );
  }

  @Patch('encounters/:encounterId/call')
  @Permissions('emergency.queue.manage')
  callEmergencyPatient(
    @Query('hospitalId') hospitalId: string,
    @Param('encounterId') encounterId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.emergencyService.callEmergencyPatient(
      hospitalId,
      user.id,
      encounterId,
    );
  }

  @Patch('encounters/:encounterId/start-treatment')
  @Permissions('emergency.treatment.start')
  startEmergencyTreatment(
    @Query('hospitalId') hospitalId: string,
    @Param('encounterId') encounterId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.emergencyService.startEmergencyTreatment(
      hospitalId,
      user.id,
      encounterId,
    );
  }
}
