import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus } from '@prisma/client';

export class ChangeMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}