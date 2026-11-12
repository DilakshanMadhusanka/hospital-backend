import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryAttendanceDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  staffAssignmentId?: string;
}