import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';

import { DepartmentStatus } from '@prisma/client';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class DepartmentQueryDto extends PaginationQueryDto {

  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(DepartmentStatus)
  status?: DepartmentStatus;
}