import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { WardType } from '@prisma/client';

export class CreateWardDto {

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(WardType)
  type: WardType;

  @IsOptional()
  @IsString()
  description?: string;
}