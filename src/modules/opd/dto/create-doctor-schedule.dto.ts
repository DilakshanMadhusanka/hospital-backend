import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateDoctorScheduleDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  departmentId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  slotMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}