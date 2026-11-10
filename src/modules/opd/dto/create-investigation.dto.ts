import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateInvestigationDto {
  @IsOptional()
  @IsString()
  investigationCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  investigationName: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clinicalReason?: string;
}