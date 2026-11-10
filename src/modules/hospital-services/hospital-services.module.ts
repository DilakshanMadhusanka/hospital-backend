import { Module } from '@nestjs/common';

import { HospitalServicesController } from './hospital-services.controller.js';
import { HospitalServicesService } from './hospital-services.service.js';

@Module({
  controllers: [HospitalServicesController],
  providers: [HospitalServicesService],
  exports: [HospitalServicesService],
})
export class HospitalServicesModule {}