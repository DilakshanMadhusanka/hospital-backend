import {
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class RegisterOpdVisitDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string;
}