import {
  IsInt,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SetLeaveBalanceDto {
  @IsUUID()
  staffAssignmentId: string;

  @IsUUID()
  leaveTypeId: string;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  entitledDays: number;
}