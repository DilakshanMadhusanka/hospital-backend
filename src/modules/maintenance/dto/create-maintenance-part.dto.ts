import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { MaintenancePartType } from '@prisma/client';

export class CreateMaintenancePartDto {
  @IsString()
  @IsNotEmpty()
  partName: string;

  @IsOptional()
  @IsEnum(MaintenancePartType)
  partType?: MaintenancePartType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}