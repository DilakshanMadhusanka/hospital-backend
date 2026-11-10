import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
  Matches,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreatePatientDto {
  @IsUUID()
  hospitalId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-9]{9}[VXvx]|[0-9]{12})$/)
  nic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  passportNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'])
  bloodGroup?:
    'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{7,20}$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
