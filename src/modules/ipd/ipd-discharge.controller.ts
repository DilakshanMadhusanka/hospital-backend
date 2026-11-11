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

import { IpdDischargeService } from './ipd-discharge.service.js';

import { CreateIPDDischargeRequestDto } from './dto/create-ipd-discharge-request.dto.js';
import { RejectIPDDischargeDto } from './dto/reject-ipd-discharge.dto.js';
import { CreateIPDDischargeSummaryDto } from './dto/create-ipd-discharge-summary.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CompleteIPDDischargeDto } from './dto/complete-ipd-discharge.dto.js';

@Controller('ipd/discharges')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IpdDischargeController {
  constructor(private readonly dischargeService: IpdDischargeService) {}

  @Post('requests')
  @Permissions('ipd.discharge.request')
  createRequest(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateIPDDischargeRequestDto,
  ) {
    return this.dischargeService.createRequest(hospitalId, user.id, dto);
  }

  @Get('requests')
  @Permissions('ipd.discharge.read')
  getRequests(
    @Query('hospitalId') hospitalId: string,
    @Query('status') status: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.getRequests(
      hospitalId,
      user.id,
      status as any,
    );
  }

  @Get('requests/:requestId')
  @Permissions('ipd.discharge.read')
  getRequestById(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.getRequestById(requestId, hospitalId, user.id);
  }

  @Patch('requests/:requestId/approve')
  @Permissions('ipd.discharge.approve')
  approveRequest(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.approveRequest(requestId, hospitalId, user.id);
  }

  @Patch('requests/:requestId/reject')
  @Permissions('ipd.discharge.approve')
  rejectRequest(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: RejectIPDDischargeDto,
  ) {
    return this.dischargeService.rejectRequest(
      requestId,
      hospitalId,
      user.id,
      dto,
    );
  }

  @Patch('requests/:requestId/cancel')
  @Permissions('ipd.discharge.request')
  cancelRequest(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.cancelRequest(requestId, hospitalId, user.id);
  }

  @Post('requests/:requestId/summary')
  @Permissions('ipd.discharge.summary.create')
  createSummary(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateIPDDischargeSummaryDto,
  ) {
    return this.dischargeService.createSummary(
      requestId,
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('requests/:requestId/summary')
  @Permissions('ipd.discharge.summary.read')
  getSummary(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.getSummary(requestId, hospitalId, user.id);
  }

  @Patch('requests/:requestId/complete')
  @Permissions('ipd.discharge.complete')
  completeDischarge(
    @Param('requestId') requestId: string,
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CompleteIPDDischargeDto,
  ) {
    return this.dischargeService.completeDischarge(
      requestId,
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('history')
  @Permissions('ipd.discharge.read')
  getDischargeHistory(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.dischargeService.getDischargeHistory(hospitalId, user.id);
  }
}
