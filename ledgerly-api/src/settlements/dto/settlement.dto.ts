import { IsNotEmpty, IsString, IsOptional, IsDateString, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

function sanitizeInput(value: string): string {
  if (!value) return value;
  return value.replace(/<[^>]*>/g, '').trim();
}

export class CreateSettlementDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  settlementGroupId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  counterpartyName?: string;

  @IsNotEmpty()
  @IsNumberString()
  amount: string;

  @IsDateString()
  settlementDate: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  notes?: string;
}

export class SettlementQueryDto {
  @IsOptional()
  @IsString()
  settlementGroupId?: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;
}
