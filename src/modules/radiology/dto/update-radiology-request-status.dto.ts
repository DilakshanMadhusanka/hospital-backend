import { IsEnum } from 'class-validator';
import { RadiologyRequestStatus } from '@prisma/client';

export class UpdateRadiologyRequestStatusDto {
  @IsEnum(RadiologyRequestStatus)
  status: RadiologyRequestStatus;
}