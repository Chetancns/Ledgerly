import { Transform } from 'class-transformer';
import { IsUUID, IsOptional, IsNumberString, IsIn, IsDateString, IsString, IsNotEmpty } from 'class-validator';

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
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() toAccountId?: string | null; // for transfers, the destination account
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
  description: string;
}
