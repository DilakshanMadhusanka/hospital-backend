import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  HospitalAssetStatus,
  HospitalAssetCondition,
} from '@prisma/client';

export class QueryAssetsDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(HospitalAssetStatus)
  status?: HospitalAssetStatus;

  @IsOptional()
  @IsEnum(HospitalAssetCondition)
  condition?: HospitalAssetCondition;

  @IsOptional()
  @IsString()
  search?: string;
}