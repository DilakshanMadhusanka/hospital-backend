import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ReceivedStockLineDto {
  @IsUUID()
  purchaseOrderItemId: string;

  @IsString()
  @MaxLength(100)
  batchNumber: string;

  @IsDateString()
  expiryDate: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;
}

export class ReceiveStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivedStockLineDto)
  items: ReceivedStockLineDto[];
}