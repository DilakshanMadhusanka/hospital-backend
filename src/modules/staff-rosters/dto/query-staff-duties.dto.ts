import {
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class QueryStaffDutiesDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  staffAssignmentId?: string;
}