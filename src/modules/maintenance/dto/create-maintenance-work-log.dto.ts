import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceWorkType } from '@prisma/client';

export class CreateMaintenanceWorkLogDto {
  @IsEnum(MaintenanceWorkType)
  workType: MaintenanceWorkType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hoursSpent?: number;
}