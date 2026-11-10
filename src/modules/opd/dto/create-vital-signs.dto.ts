import {
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateVitalSignsDto {
  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(45)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(40)
  @Max(300)
  systolicBP?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(200)
  diastolicBP?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  pulseRate?: number;

  @IsOptional()
  @IsInt()
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
  @IsNumber()
  @Min(0)
  @Max(300)
  heightCm?: number;
}