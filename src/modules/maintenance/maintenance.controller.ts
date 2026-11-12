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

import { MaintenanceService } from './maintenance.service.js';

import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto.js';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto.js';
import { ChangeMaintenanceStatusDto } from './dto/change-maintenance-status.dto.js';
import { CreateMaintenanceWorkLogDto } from './dto/create-maintenance-work-log.dto.js';
import { CreateMaintenancePartDto } from './dto/create-maintenance-part.dto.js';
import { QueryMaintenanceDto } from './dto/query-maintenance.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // Create a maintenance request
  @Post('requests')
  @Permissions('maintenance.requests.create')
  createRequest(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Body() dto: CreateMaintenanceRequestDto,
  ) {
    return this.maintenanceService.createRequest(
      user.id,
      hospitalId,
      dto,
    );
  }

  // Get maintenance requests
  @Get('requests')
  @Permissions('maintenance.requests.read')
  getRequests(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Query() query: QueryMaintenanceDto,
  ) {
    return this.maintenanceService.getRequests(
      user.id,
      hospitalId,
      query,
    );
  }

  // Get one maintenance request
  @Get('requests/:requestId')
  @Permissions('maintenance.requests.read')
  getRequestById(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.maintenanceService.getRequestById(
      user.id,
      hospitalId,
      requestId,
    );
  }

  // Approve a request
  @Patch('requests/:requestId/approve')
  @Permissions('maintenance.requests.manage')
  approveRequest(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.maintenanceService.approveRequest(
      user.id,
      hospitalId,
      requestId,
    );
  }

  // Reject a request
  @Patch('requests/:requestId/reject')
  @Permissions('maintenance.requests.manage')
  rejectRequest(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
    @Body('reason') reason: string,
  ) {
    return this.maintenanceService.rejectRequest(
      user.id,
      hospitalId,
      requestId,
      reason,
    );
  }

  // Assign a technician
  @Patch('requests/:requestId/assign')
  @Permissions('maintenance.requests.manage')
  assignTechnician(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
    @Body() dto: AssignMaintenanceDto,
  ) {
    return this.maintenanceService.assignTechnician(
      user.id,
      hospitalId,
      requestId,
      dto,
    );
  }

  // Change request status
  @Patch('requests/:requestId/status')
  @Permissions('maintenance.work.manage')
  changeRequestStatus(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ChangeMaintenanceStatusDto,
  ) {
    return this.maintenanceService.changeRequestStatus(
      user.id,
      hospitalId,
      requestId,
      dto,
    );
  }

  // Add work log
  @Post('requests/:requestId/work-logs')
  @Permissions('maintenance.work.manage')
  addWorkLog(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
    @Body() dto: CreateMaintenanceWorkLogDto,
  ) {
    return this.maintenanceService.addWorkLog(
      user.id,
      hospitalId,
      requestId,
      dto,
    );
  }

  // Add parts and materials
  @Post('requests/:requestId/parts')
  @Permissions('maintenance.work.manage')
  addPart(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
    @Param('requestId') requestId: string,
    @Body() dto: CreateMaintenancePartDto,
  ) {
    return this.maintenanceService.addPart(
      user.id,
      hospitalId,
      requestId,
      dto,
    );
  }

  // Dashboard summary
  @Get('summary')
  @Permissions('maintenance.requests.read')
  getSummary(
    @CurrentUser() user: { id: string },
    @Query('hospitalId') hospitalId: string,
  ) {
    return this.maintenanceService.getSummary(
      user.id,
      hospitalId,
    );
  }
}