import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferIPDBedDto {
  @IsUUID()
  @IsNotEmpty()
  toBedId: string;
}