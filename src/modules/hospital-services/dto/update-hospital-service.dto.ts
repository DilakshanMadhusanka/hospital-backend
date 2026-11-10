import { PartialType } from '@nestjs/swagger';
import { CreateHospitalServiceDto } from './create-hospital-service.dto.js';

export class UpdateHospitalServiceDto extends PartialType(
  CreateHospitalServiceDto,
) {}