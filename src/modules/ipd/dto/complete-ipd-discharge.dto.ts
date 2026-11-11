
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CompleteIPDDischargeDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
