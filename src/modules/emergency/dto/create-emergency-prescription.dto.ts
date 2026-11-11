
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class EmergencyPrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  medicineName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  dosage: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  frequency: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  duration: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}

export class CreateEmergencyPrescriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmergencyPrescriptionItemDto)
  items: EmergencyPrescriptionItemDto[];
}
