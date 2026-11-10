import { IsUUID } from 'class-validator';

export class AllocateBedDto {
  @IsUUID()
  bedId: string;
}