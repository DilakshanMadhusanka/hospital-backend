import { Module } from '@nestjs/common';

import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

import { DatabaseModule } from '../../database/database.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    DatabaseModule,
    RbacModule,
  ],
  controllers: [PatientsController],
  providers: [
    PatientsService,
    JwtAuthGuard,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}