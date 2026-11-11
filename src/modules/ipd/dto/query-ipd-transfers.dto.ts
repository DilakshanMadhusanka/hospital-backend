
import {
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { IPDTransferStatus } from '@prisma/client';

export class QueryIPDTransfersDto {
  @IsOptional()
  @IsEnum(IPDTransferStatus)
  status?: IPDTransferStatus;

  @IsOptional()
  @IsUUID()
  wardId?: string;
}
