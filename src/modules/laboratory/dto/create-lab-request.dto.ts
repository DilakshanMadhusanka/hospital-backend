import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateLabRequestDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  @ValidateIf((dto) => dto.ipdAdmissionId === undefined)
  opdVisitId?: string;

  @IsOptional()
  @IsUUID()
  ipdAdmissionId?: string;

  @IsIn(['ROUTINE', 'URGENT', 'STAT'])
  priority: 'ROUTINE' | 'URGENT' | 'STAT';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalNotes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  testIds: string[];
}