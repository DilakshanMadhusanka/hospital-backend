import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateMedicalHistoryDto {
  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  diagnosedAt?: string;
}