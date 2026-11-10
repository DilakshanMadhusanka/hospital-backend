import { Module } from '@nestjs/common';

import { IpdController } from './ipd.controller.js';
import { IpdService } from './ipd.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [IpdController],
  providers: [IpdService],
  exports: [IpdService],
})
export class IpdModule {}