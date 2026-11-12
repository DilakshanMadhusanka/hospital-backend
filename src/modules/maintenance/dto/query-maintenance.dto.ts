import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  MaintenancePriority,
  MaintenanceStatus,
} from '@prisma/client';

export class QueryMaintenanceDto {
  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}