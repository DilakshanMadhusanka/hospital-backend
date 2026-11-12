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

import { StaffAttendanceService } from './staff-attendance.service.js';

import { CheckInDto } from './dto/check-in.dto.js';
import { CorrectAttendanceDto } from './dto/correct-attendance.dto.js';
import { QueryAttendanceDto } from './dto/query-attendance.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { Permissions } from '../rbac/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('staff-attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffAttendanceController {
  constructor(
    private readonly attendanceService: StaffAttendanceService,
  ) {}

  @Post('check-in')
  @Permissions('staff.attendance.check-in')
  checkIn(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(
      hospitalId,
      user.id,
      dto,
    );
  }

  @Patch(':attendanceId/check-out')
  @Permissions('staff.attendance.check-out')
  checkOut(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('attendanceId') attendanceId: string,
  ) {
    return this.attendanceService.checkOut(
      hospitalId,
      user.id,
      attendanceId,
    );
  }

  @Patch(':attendanceId/correct')
  @Permissions('staff.attendance.manage')
  correctAttendance(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('attendanceId') attendanceId: string,
    @Body() dto: CorrectAttendanceDto,
  ) {
    return this.attendanceService.correctAttendance(
      hospitalId,
      user.id,
      attendanceId,
      dto,
    );
  }

  @Post('duties/:dutyAssignmentId/mark-absent')
  @Permissions('staff.attendance.manage')
  markAbsent(
    @Query('hospitalId') hospitalId: string,
    @CurrentUser() user: { id: string },
    @Param('dutyAssignmentId') dutyAssignmentId: string,
  ) {
    return this.attendanceService.markAbsent(
      hospitalId,
      user.id,
      dutyAssignmentId,
    );
  }

  @Get()
  @Permissions('staff.attendance.read')
  getAttendance(
    @Query('hospitalId') hospitalId: string,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.getAttendance(
      hospitalId,
      query,
    );
  }

  @Get('daily-summary')
  @Permissions('staff.attendance.read')
  getDailySummary(
    @Query('hospitalId') hospitalId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailySummary(
      hospitalId,
      date,
    );
  }
}