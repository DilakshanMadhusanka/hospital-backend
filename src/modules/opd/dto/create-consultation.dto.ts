import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateConsultationDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  symptoms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  treatmentPlan?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}