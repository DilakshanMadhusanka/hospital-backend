import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAdmissionDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  attendingDoctorId?: string;

  @IsString()
  @MaxLength(1000)
  admissionReason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admissionDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  clinicalNotes?: string;
}