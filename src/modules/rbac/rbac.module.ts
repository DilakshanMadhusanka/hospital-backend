import { Module } from '@nestjs/common';

import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
    imports: [DatabaseModule],
  controllers: [RbacController],
  providers: [
    RbacService,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    RbacService,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class RbacModule {}