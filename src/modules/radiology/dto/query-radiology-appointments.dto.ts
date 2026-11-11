import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { RadiologyAppointmentStatus } from '@prisma/client';

export class QueryRadiologyAppointmentsDto {
  @IsOptional()
  @IsEnum(RadiologyAppointmentStatus)
  status?: RadiologyAppointmentStatus;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}