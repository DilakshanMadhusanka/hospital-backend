import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssetCategoryDto {
  @IsString()
  @MaxLength(30)
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}