import { IsString, MaxLength } from 'class-validator';

export class DischargePatientDto {
  @IsString()
  @MaxLength(5000)
  dischargeSummary: string;

  @IsString()
  @MaxLength(3000)
  dischargeInstructions: string;
}