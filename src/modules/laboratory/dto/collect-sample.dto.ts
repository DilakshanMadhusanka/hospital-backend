import { IsString, MaxLength } from 'class-validator';

export class CollectSampleDto {
  @IsString()
  @MaxLength(100)
  specimenType: string;
}