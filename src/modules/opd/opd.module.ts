import { Module } from '@nestjs/common';

import { OpdController } from './opd.controller.js';
import { OpdService } from './opd.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [OpdController],
  providers: [OpdService],
  exports: [OpdService],
})
export class OpdModule {}