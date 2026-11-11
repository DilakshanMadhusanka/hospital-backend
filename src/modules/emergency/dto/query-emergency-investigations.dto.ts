
import {
  IsOptional,
  IsUUID,
} from 'class-validator';

export class QueryEmergencyInvestigationsDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
