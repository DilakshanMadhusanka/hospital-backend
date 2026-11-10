import { IsIn } from 'class-validator';

export class UpdateOpdVisitStatusDto {
  @IsIn([
    'WAITING',
    'CALLED',
    'IN_CONSULTATION',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ])
  status: string;
}