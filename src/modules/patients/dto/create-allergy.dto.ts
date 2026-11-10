import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  @IsNotEmpty()
  allergen: string;

  @IsOptional()
  @IsString()
  reaction?: string;

  @IsOptional()
  @IsIn(['MILD', 'MODERATE', 'SEVERE', 'UNKNOWN'])
  severity?: 'MILD' | 'MODERATE' | 'SEVERE' | 'UNKNOWN';
}
