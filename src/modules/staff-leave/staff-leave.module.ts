import { Module } from '@nestjs/common';

import { StaffLeaveController } from './staff-leave.controller.js';
import { StaffLeaveService } from './staff-leave.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    StaffLeaveController,
  ],
  providers: [
    StaffLeaveService,
  ],
  exports: [
    StaffLeaveService,
  ],
})
export class StaffLeaveModule {}