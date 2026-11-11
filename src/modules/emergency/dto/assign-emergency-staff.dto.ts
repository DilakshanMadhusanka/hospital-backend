
import { IsOptional, IsUUID } from 'class-validator';

export class AssignEmergencyStaffDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  nurseId?: string;
}
