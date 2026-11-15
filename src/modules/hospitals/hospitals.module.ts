import { Module } from '@nestjs/common';

import { HospitalsController } from './hospitals.controller.js';
import { HospitalsService } from './hospitals.service.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [RbacModule],
  controllers: [HospitalsController],
  providers: [HospitalsService],
  exports: [HospitalsService],
})
export class HospitalsModule {}