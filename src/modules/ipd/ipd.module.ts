import { Module } from '@nestjs/common';

import { IpdController } from './ipd.controller.js';
import { IpdService } from './ipd.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { IpdTransferService } from './ipd-transfer.service.js';
import { IpdTransferController } from './ipd-transfer.controller.js';
import { IpdDischargeController } from './ipd-discharge.controller.js';
import { IpdDischargeService } from './ipd-discharge.service.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [IpdController, IpdTransferController, IpdDischargeController,],
  providers: [IpdService, IpdTransferService, IpdDischargeService,],
  exports: [IpdService, IpdTransferService,],
})
export class IpdModule {}