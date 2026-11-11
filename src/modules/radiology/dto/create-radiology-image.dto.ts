import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

export class CreateRadiologyImageDto {
  @IsUUID()
  reportId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  storageKey: string;

  @IsString()
  @Matches(/^(image\/(jpeg|png|webp)|application\/dicom)$/)
  mimeType: string;

  @IsInt()
  @Min(1)
  fileSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  checksum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}