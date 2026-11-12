import { Module } from '@nestjs/common';

import { StaffAttendanceController } from './staff-attendance.controller.js';
import { StaffAttendanceService } from './staff-attendance.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    StaffAttendanceController,
  ],
  providers: [
    StaffAttendanceService,
  ],
  exports: [
    StaffAttendanceService,
  ],
})
export class StaffAttendanceModule {}