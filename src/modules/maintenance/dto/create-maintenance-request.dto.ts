import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  MaintenancePriority,
  MaintenanceRequestType,
} from '@prisma/client';

export class CreateMaintenanceRequestDto {
  @IsEnum(MaintenanceRequestType)
  requestType: MaintenanceRequestType;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  wardId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsString()
  estimatedCost?: string;
}