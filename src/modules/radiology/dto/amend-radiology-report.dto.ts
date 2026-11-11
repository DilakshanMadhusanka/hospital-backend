import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AmendRadiologyReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalHistory?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(15000)
  findings: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  impression: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  recommendations?: string;
}