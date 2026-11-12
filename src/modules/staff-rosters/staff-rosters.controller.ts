import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { StaffRostersService } from './staff-rosters.service.js';

import { CreateHospitalShiftDto } from './dto/create-hospital-shift.dto.js';
import { CreateStaffDutyDto } from './dto/create-staff-duty.dto.js';
import { QueryStaffDutiesDto } from './dto/query-staff-duties.dto.js';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';

@Controller('staff-rosters')
export class StaffRostersController {
  constructor(
    private readonly staffRostersService: StaffRostersService,
  ) {}

  @Post('shifts')
  @Permissions('staff.shifts.manage')
  createShift(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateHospitalShiftDto,
  ) {
    return this.staffRostersService.createShift(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('shifts')
  @Permissions('staff.shifts.read')
  getShifts(
    @Query('hospitalId') hospitalId: string,
    @Query('departmentId') departmentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.staffRostersService.getShifts(
      hospitalId,
      user.id,
      departmentId,
    );
  }

  @Post('duties')
  @Permissions('staff.rosters.manage')
  createDuty(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateStaffDutyDto,
  ) {
    return this.staffRostersService.createDuty(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Get('duties')
  @Permissions('staff.rosters.read')
  getDuties(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Query() query: QueryStaffDutiesDto,
  ) {
    return this.staffRostersService.getDuties(
      hospitalId,
      user.id,
      query,
    );
  }

  @Patch('duties/:dutyId/cancel')
  @Permissions('staff.rosters.manage')
  cancelDuty(
    @Query('hospitalId') hospitalId: string,
    @Param('dutyId') dutyId: string,
    @Query('reason') reason: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.staffRostersService.cancelDuty(
      hospitalId,
      user.id,
      dutyId,
      reason,
    );
  }
}