import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class EnterLabResultDto {
  @IsString()
  @MaxLength(2000)
  resultValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  interpretation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}