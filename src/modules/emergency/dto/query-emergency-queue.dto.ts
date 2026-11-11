
import { IsOptional, IsUUID } from 'class-validator';

export class QueryEmergencyQueueDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
