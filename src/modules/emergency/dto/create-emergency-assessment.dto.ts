
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { EmergencyAssessmentType } from '@prisma/client';

export class CreateEmergencyAssessmentDto {
  @IsEnum(EmergencyAssessmentType)
  assessmentType: EmergencyAssessmentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  presentingComplaint: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  historyOfPresentIllness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  relevantMedicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  examinationFindings?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  provisionalDiagnosis: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  differentialDiagnosis?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  treatmentPlan: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  clinicalNotes?: string;
}
