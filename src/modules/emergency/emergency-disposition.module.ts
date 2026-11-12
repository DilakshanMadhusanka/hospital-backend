
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { EmergencyDispositionService } from './emergency-disposition.service.js';

@Module({
  imports: [DatabaseModule, RbacModule],
  providers: [EmergencyDispositionService],
  exports: [EmergencyDispositionService],
})
export class EmergencyDispositionModule {}
