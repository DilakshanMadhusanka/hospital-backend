import { IsEnum, IsOptional, IsString } from 'class-validator';

import {
  HospitalType,
  HospitalStatus,
} from '@prisma/client';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class HospitalQueryDto extends PaginationQueryDto {

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(HospitalType)
  type?: HospitalType;

  @IsOptional()
  @IsEnum(HospitalStatus)
  status?: HospitalStatus;
}