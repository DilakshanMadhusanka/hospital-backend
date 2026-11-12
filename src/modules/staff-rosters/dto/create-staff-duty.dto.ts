import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateStaffDutyDto {
  @IsUUID()
  staffAssignmentId: string;

  @IsUUID()
  shiftId: string;

  // Use YYYY-MM-DD.
  @IsDateString()
  dutyDate: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}