import { IsUUID } from 'class-validator';

export class AssignDoctorDto {
  @IsUUID()
  doctorId: string;
}