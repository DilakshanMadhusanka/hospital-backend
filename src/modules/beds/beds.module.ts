import { Module } from '@nestjs/common';

import { BedsController } from './beds.controller.js';
import { BedsService } from './beds.service.js';

@Module({
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}