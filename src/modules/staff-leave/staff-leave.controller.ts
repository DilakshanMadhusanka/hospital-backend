import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { StaffLeaveService } from './staff-leave.service.js';

import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto.js';
import { ReviewLeaveDto } from './dto/review-leave.dto.js';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';

import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('staff-leave')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffLeaveController {
  constructor(
    private readonly leaveService: StaffLeaveService,
  ) {}

  @Post('types')
  @Permissions('staff.leave.manage')
  createLeaveType(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.leaveService.createLeaveType(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('types')
  @Permissions('staff.leave.read')
  getLeaveTypes(
    @Query('hospitalId') hospitalId: string,
  ) {
    return this.leaveService.getLeaveTypes(hospitalId);
  }

  @Post('balances')
  @Permissions('staff.leave.manage')
  setLeaveBalance(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SetLeaveBalanceDto,
  ) {
    return this.leaveService.setLeaveBalance(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Post('applications')
  @Permissions('staff.leave.apply')
  applyForLeave(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateLeaveApplicationDto,
  ) {
    return this.leaveService.applyForLeave(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Post('applications/:applicationId/review')
  @Permissions('staff.leave.manage')
  reviewApplication(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.reviewApplication(
      hospitalId,
      user.id,
      applicationId,
      dto,
    );
  }

  @Get('applications')
  @Permissions('staff.leave.read')
  getApplications(
    @Query('hospitalId') hospitalId: string,
    @Query('status') status?: string,
  ) {
    return this.leaveService.getApplications(
      hospitalId,
      status,
    );
  }

  @Get('my-applications')
  @Permissions('staff.leave.apply')
  getMyApplications(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.leaveService.getMyApplications(
      hospitalId,
      user.id,
    );
  }

  @Get('my-balances')
  @Permissions('staff.leave.apply')
  getMyBalances(
    @Query('hospitalId') hospitalId: string,
    @Query('year') year: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.leaveService.getMyBalances(
      hospitalId,
      user.id,
      Number(year),
    );
  }
}