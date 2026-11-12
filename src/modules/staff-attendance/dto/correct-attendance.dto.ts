import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CorrectAttendanceDto {
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @IsOptional()
  @IsDateString()
  checkOutAt?: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}