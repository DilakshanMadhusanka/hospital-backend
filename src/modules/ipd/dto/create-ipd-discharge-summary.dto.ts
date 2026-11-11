
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIPDDischargeSummaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  finalDiagnosis: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  secondaryDiagnoses?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  treatmentProvided: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  proceduresPerformed?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  conditionAtDischarge: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  dischargeMedications: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  medicationInstructions?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  followUpInstructions: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  warningSigns?: string;
}
