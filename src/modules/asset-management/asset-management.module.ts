import { Module } from '@nestjs/common';

import { AssetManagementController } from './asset-management.controller.js';
import { AssetManagementService } from './asset-management.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [
    AssetManagementController,
  ],
  providers: [
    AssetManagementService,
  ],
  exports: [
    AssetManagementService,
  ],
})
export class AssetManagementModule {}