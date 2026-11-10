import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

import { BedStatus } from '@prisma/client';

export class UpdateBedDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bedNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BedStatus)
  status?: BedStatus;
}