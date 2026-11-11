import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { RadiologyPriority } from '@prisma/client';

export class CreateRadiologyRequestDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  departmentId: string;

  @IsUUID()
  procedureId: string;

  @IsOptional()
  @IsString()
  opdVisitId?: string;

  @IsOptional()
  @IsString()
  ipdAdmissionId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  clinicalIndication: string;

  @IsOptional()
  @IsEnum(RadiologyPriority)
  priority?: RadiologyPriority;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}