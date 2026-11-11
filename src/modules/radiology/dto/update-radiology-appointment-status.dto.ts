import { IsEnum } from 'class-validator';
import { RadiologyAppointmentStatus } from '@prisma/client';

export class UpdateRadiologyAppointmentStatusDto {
  @IsEnum(RadiologyAppointmentStatus)
  status: RadiologyAppointmentStatus;
}