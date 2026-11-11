import { Module } from '@nestjs/common';

import { IpdController } from './ipd.controller.js';
import { IpdService } from './ipd.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { IpdTransferService } from './ipd-transfer.service.js';
import { IpdTransferController } from './ipd-transfer.controller.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [IpdController, IpdTransferController,],
  providers: [IpdService, IpdTransferService,],
  exports: [IpdService, IpdTransferService,],
})
export class IpdModule {}