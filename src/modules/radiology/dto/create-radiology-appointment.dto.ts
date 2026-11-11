import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateRadiologyAppointmentDto {
  @IsUUID()
  requestId: string;

  @IsUUID()
  equipmentId: string;

  @IsDateString()
  scheduledStart: string;

  @IsDateString()
  scheduledEnd: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}