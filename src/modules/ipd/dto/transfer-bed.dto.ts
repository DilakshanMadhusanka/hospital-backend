import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransferBedDto {
  @IsUUID()
  newBedId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}