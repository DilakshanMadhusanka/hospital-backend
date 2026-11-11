import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RadiologyRequestStatus } from '@prisma/client';

export class QueryRadiologyRequestsDto {
  @IsOptional()
  @IsEnum(RadiologyRequestStatus)
  status?: RadiologyRequestStatus;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}