
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

import { EmergencyArrivalMode } from '@prisma/client';

export class CreateEmergencyEncounterDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsUUID()
  departmentId: string;

  @IsEnum(EmergencyArrivalMode)
  arrivalMode: EmergencyArrivalMode;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  arrivalSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referralHospital?: string;

  @IsOptional()
  @IsBoolean()
  isUnknownPatient?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  temporaryPatientName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  temporaryAge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  temporaryGender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  identifyingNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaint?: string;
}
