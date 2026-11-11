
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class RejectIPDDischargeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  rejectionReason: string;
}
