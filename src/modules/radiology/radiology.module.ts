import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { RadiologyController } from './radiology.controller.js';
import { RadiologyService } from './radiology.service.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [RadiologyController],
  providers: [RadiologyService],
  exports: [RadiologyService],
})
export class RadiologyModule {}