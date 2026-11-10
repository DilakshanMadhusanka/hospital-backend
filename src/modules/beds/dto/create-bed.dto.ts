import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBedDto {

  @IsUUID()
  hospitalId: string;

  @IsUUID()
  wardId: string;

  @IsString()
  @IsNotEmpty()
  bedNumber: string;

  @IsOptional()
  @IsString()
  description?: string;
}