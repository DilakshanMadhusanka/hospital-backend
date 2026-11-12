import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckInDto {
  @IsString()
  dutyAssignmentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}