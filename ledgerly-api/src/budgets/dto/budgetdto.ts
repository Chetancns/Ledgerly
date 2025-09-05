import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumberString
} from 'class-validator';

import type { BudgetPeriod } from "../budget.entity";


export class CreateBudgetDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNumberString()
  amount: string;

  @IsOptional()
  period?: BudgetPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  carriedOver?: boolean;

  @IsOptional()
  @IsUUID()
  sourceBudgetId?: string;
}

export type BudgetCategory = {
  budgetId: string;
  categoryId: string;
  amount: number;
  spent: number;
  percent: number;
};