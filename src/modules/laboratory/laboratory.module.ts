import { Module } from '@nestjs/common';

import { LaboratoryController } from './laboratory.controller.js';
import { LaboratoryService } from './laboratory.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}