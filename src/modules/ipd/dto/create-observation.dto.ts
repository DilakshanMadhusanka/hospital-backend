import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateObservationDto {
  @IsOptional()
  @IsIn(['ROUTINE', 'DOCTOR_REVIEW', 'EMERGENCY'])
  type?: 'ROUTINE' | 'DOCTOR_REVIEW' | 'EMERGENCY';

  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(45)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(300)
  systolicBP?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(200)
  diastolicBP?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  pulseRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(80)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}