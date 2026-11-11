import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReceiveSampleDto {
  @IsIn(['RECEIVED', 'REJECTED'])
  action: 'RECEIVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}