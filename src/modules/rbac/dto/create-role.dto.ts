import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayUnique,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}