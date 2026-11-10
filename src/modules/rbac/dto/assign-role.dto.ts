import {
  IsUUID,
  IsOptional,
} from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}