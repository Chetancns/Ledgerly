import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { DEBT_TYPES } from '../debt.entity';
import { DEBT_UPDATE_INTENTS } from '../debt-update.entity';
import type { DebtType } from '../debt.entity';
import type { DebtUpdateIntent } from '../debt-update.entity';
import { sanitizeInput } from '../../utils/sanitize.util';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
type DebtFrequency = (typeof FREQUENCIES)[number];

const toNumber = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') return Number(value.replace(/,/g, ''));
  return value;
};

const toOptionalString = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return typeof value === 'string' ? sanitizeInput(value) : value;
};

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

export class CreateDebtDto {
  @IsString()
  @Transform(toOptionalString)
  name: string;

  @IsUUID()
  accountId: string;

  @IsOptional()
  @IsIn(DEBT_TYPES)
  debtType?: DebtType;

  @ValidateIf((dto: CreateDebtDto) => dto.debtType === 'borrowed' || dto.debtType === 'lent')
  @IsNotEmpty()
  @IsString()
  @Transform(toOptionalString)
  personName?: string;

  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  principal: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  currentBalance?: number;

  @ValidateIf((dto: CreateDebtDto) => dto.debtType === 'institutional')
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  installmentAmount?: number;

  @ValidateIf((dto: CreateDebtDto) => dto.debtType === 'institutional')
  @IsIn(FREQUENCIES)
  frequency?: DebtFrequency;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(1)
  term?: number;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  createTransaction?: boolean;

  @ValidateIf((dto: CreateDebtDto) => dto.createTransaction === true)
  @IsUUID()
  categoryId?: string;
}

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @Transform(toOptionalString)
  name?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  principal?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentBalance?: number;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  installmentAmount?: number;

  @IsOptional()
  @IsIn(FREQUENCIES)
  frequency?: DebtFrequency;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber()
  @Min(1)
  term?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @IsIn(['active', 'completed'])
  status?: 'active' | 'completed';

  @IsOptional()
  @IsString()
  @Transform(toOptionalString)
  personName?: string;
}

export class RecordDebtUpdateDto {
  @IsOptional()
  @IsIn(DEBT_UPDATE_INTENTS)
  intent?: DebtUpdateIntent;

  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsDateString()
  updateDate?: string;

  @IsOptional()
  @IsString()
  @Transform(toOptionalString)
  note?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  createTransaction?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  settleInFull?: boolean;
}

export class PayInstallmentDto {
  @IsOptional()
  @Transform(toNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  createTransaction?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  settleInFull?: boolean;

  @IsOptional()
  @IsString()
  @Transform(toOptionalString)
  note?: string;
}
