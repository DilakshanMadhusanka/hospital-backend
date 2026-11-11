import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  genericName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  strength?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosageForm?: string;

  @IsString()
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  reorderLevel?: number;
}