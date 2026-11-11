
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class RejectIPDTransferDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  rejectionReason: string;
}
