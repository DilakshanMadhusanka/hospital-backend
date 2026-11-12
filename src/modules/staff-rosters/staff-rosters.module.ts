import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { StaffRostersController } from './staff-rosters.controller.js';
import { StaffRostersService } from './staff-rosters.service.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    StaffRostersController,
  ],
  providers: [
    StaffRostersService,
  ],
  exports: [
    StaffRostersService,
  ],
})
export class StaffRostersModule {}