import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { RbacService } from './rbac.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';

@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('permissions')
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Post('assign-role')
  assignRole(@Body() dto: AssignRoleDto) {
    return this.rbacService.assignRole(dto);
  }

  @Get('users/:userId/roles')
  getUserRoles(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.rbacService.getUserRoles(userId);
  }

  @Delete('assignments/:assignmentId')
  removeRoleAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.rbacService.removeRoleAssignment(assignmentId);
  }
}