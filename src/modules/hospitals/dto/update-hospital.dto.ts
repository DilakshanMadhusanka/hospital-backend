import { PartialType } from '@nestjs/swagger';
import { CreateHospitalDto } from './create-hospital.dto.js';

export class UpdateHospitalDto extends PartialType(
  CreateHospitalDto,
) {}