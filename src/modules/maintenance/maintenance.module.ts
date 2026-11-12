import { Module } from '@nestjs/common';

import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    MaintenanceController,
  ],
  providers: [
    MaintenanceService,
  ],
  exports: [
    MaintenanceService,
  ],
})
export class MaintenanceModule {}