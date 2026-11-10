import { IsString, MaxLength } from 'class-validator';

export class CreateNursingNoteDto {
  @IsString()
  @MaxLength(5000)
  note: string;

  @IsString()
  @MaxLength(3000)
  careProvided: string;
}