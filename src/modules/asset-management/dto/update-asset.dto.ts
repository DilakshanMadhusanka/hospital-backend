import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  HospitalAssetCondition,
  HospitalAssetStatus,
} from '@prisma/client';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(HospitalAssetCondition)
  condition?: HospitalAssetCondition;

  @IsOptional()
  @IsEnum(HospitalAssetStatus)
  status?: HospitalAssetStatus;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}