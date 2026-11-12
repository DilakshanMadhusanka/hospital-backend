import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLeaveApplicationDto {
  @IsUUID()
  staffAssignmentId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsString()
  attachmentKey?: string;
}