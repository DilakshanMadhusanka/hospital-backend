import { PartialType } from '@nestjs/swagger';
import { CreateWardDto } from './create-ward.dto.js';

export class UpdateWardDto extends PartialType(
  CreateWardDto,
) {}