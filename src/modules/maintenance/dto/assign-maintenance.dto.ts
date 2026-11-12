import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignMaintenanceDto {
  @IsUUID()
  assignedToId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}