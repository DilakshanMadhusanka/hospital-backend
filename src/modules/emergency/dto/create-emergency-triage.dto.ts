
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { EmergencyTriageCategory } from '@prisma/client';

export class CreateEmergencyTriageDto {
  @IsUUID()
  encounterId: string;

  @IsEnum(EmergencyTriageCategory)
  category: EmergencyTriageCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  chiefComplaint: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  symptoms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  triageNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(45)
  temperatureC?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  systolicBP?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  diastolicBP?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  pulseRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScore?: number;
}
