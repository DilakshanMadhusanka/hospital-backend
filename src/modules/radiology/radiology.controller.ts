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
    return this.radiologyService.createRequest(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('requests')
  @Permissions('radiology.requests.read')
  getRequests(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Query() filters: QueryRadiologyRequestsDto,
  ) {
    return this.radiologyService.getRequests(
      hospitalId,
      user.id,
      filters,
    );
  }

  @Get('requests/:requestId')
  @Permissions('radiology.requests.read')
  getRequestById(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('requestId') requestId: string,
  ) {
    return this.radiologyService.getRequestById(
      hospitalId,
      user.id,
      requestId,
    );
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
}