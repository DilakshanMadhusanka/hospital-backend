
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEmergencyObservationDto {
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bloodGlucoseMmol?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  consciousnessLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}
