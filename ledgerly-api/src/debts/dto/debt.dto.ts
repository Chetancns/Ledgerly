import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsNumberString, IsNumber } from 'class-validator';
import { sanitizeInput } from '../../utils/sanitize.util';

export class CreateDebtDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  name: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsNotEmpty()
  @IsNumberString()
  principal: string;

  @IsOptional()
  @IsIn(['lent', 'borrowed', 'institutional'])
  role?: 'lent' | 'borrowed' | 'institutional';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  counterpartyName?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  notes?: string;
  
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  settlementGroupId?: string;

  // NEW: Option to create transaction immediately
  @IsOptional()
  @IsString()
  createTransaction?: 'yes' | 'no';
  
  @IsOptional()
  @IsString()
  categoryId?: string;

  // Fields for institutional debts (loans, credit cards)
  @IsOptional()
  @IsNumberString()
  installmentAmount?: string;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  frequency?: 'weekly' | 'biweekly' | 'monthly';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  term?: number;
}

export class AddRepaymentDto {
  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsNumberString()
  adjustmentAmount?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  notes?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  name?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsIn(['open', 'settled', 'overdue'])
  status?: 'open' | 'settled' | 'overdue';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  notes?: string;
}
