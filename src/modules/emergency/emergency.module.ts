
import { Module } from '@nestjs/common';

import { EmergencyController } from './emergency.controller.js';
import { EmergencyService } from './emergency.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    EmergencyController,
  ],
  providers: [
    EmergencyService,
  ],
  exports: [
    EmergencyService,
  ],
})
export class EmergencyModule {}
