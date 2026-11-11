
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateIPDTransferDto {
  @IsUUID()
  admissionId: string;

  @IsUUID()
  toWardId: string;

  @IsUUID()
  toBedId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalNotes?: string;
}
