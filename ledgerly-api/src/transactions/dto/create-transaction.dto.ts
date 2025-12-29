import { Transform } from 'class-transformer';
import { IsUUID, IsOptional, IsNumberString, IsIn, IsDateString, IsString, IsNotEmpty, IsArray } from 'class-validator';
import { sanitizeInput } from '../../utils/sanitize.util';

export class CreateTransactionDto {
  @IsOptional() @IsUUID() userId: string; // from auth in real apps; keep here for simplicity or inject from req.user
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string'
      ? parseFloat(value.replace(/,/g, ''))
      : value
  )
  @IsNumberString() amount: string;
  @IsOptional() @IsIn(['expense' , 'income' , 'savings','transfer']) type: 'expense' | 'income' | 'savings' | 'transfer';
  @IsOptional() @IsDateString() transactionDate: string;
  @IsOptional() 
  @IsString() 
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  description?: string;
  @IsOptional() @IsUUID() toAccountId?: string | null; // for transfers, the destination account
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[]; // Array of tag IDs to associate with this transaction
}

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  cat: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  type?: 'transfer'; // Optional, but still validated if present
  @IsOptional() @IsDateString() date: string;
  @Transform(({ value }) => value ? sanitizeInput(value) : value)
  description: string;
}
