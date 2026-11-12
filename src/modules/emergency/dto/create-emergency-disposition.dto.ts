
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const EmergencyDispositionType = {
  ADMITTED: 'ADMITTED',
  TRANSFERRED: 'TRANSFERRED',
  DISCHARGED: 'DISCHARGED',
  DECEASED: 'DECEASED',
} as const;

type EmergencyDispositionType =
  (typeof EmergencyDispositionType)[keyof typeof EmergencyDispositionType];

export class CreateEmergencyDispositionDto {
  @IsEnum(EmergencyDispositionType)
  outcome: EmergencyDispositionType;

  // Required for ADMITTED.
  @ValidateIf((o) => o.outcome === 'ADMITTED')
  @IsString()
  ipdAdmissionId?: string;

  // Required for TRANSFERRED.
  @ValidateIf((o) => o.outcome === 'TRANSFERRED')
  @IsString()
  @MaxLength(200)
  receivingHospitalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receivingHospitalContact?: string;

  @ValidateIf((o) => o.outcome === 'TRANSFERRED')
  @IsString()
  @MaxLength(2000)
  transferReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  transferNotes?: string;

  // Required for DISCHARGED.
  @ValidateIf((o) => o.outcome === 'DISCHARGED')
  @IsString()
  @MaxLength(5000)
  dischargeInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  followUpInstructions?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  // Required for DECEASED.
  @ValidateIf((o) => o.outcome === 'DECEASED')
  @IsDateString()
  deathAt?: string;

  @ValidateIf((o) => o.outcome === 'DECEASED')
  @IsString()
  @MaxLength(3000)
  deathDocumentation?: string;
}
