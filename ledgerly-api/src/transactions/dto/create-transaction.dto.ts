import { IsUUID, IsOptional, IsNumberString, IsIn, IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class CreateTransactionDto {
  @IsOptional() @IsUUID() userId: string; // from auth in real apps; keep here for simplicity or inject from req.user
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsNumberString() amount: string;
  @IsOptional() @IsIn(['expense' , 'income' , 'savings']) type: 'expense' | 'income' | 'savings';
  @IsOptional() @IsDateString() transactionDate: string;
  @IsOptional() @IsString() description?: string;
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
}
