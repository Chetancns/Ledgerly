import { IsUUID, IsOptional, IsNumberString, IsIn, IsDateString, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsOptional() @IsUUID() userId: string; // from auth in real apps; keep here for simplicity or inject from req.user
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsNumberString() amount: string;
  @IsOptional() @IsIn(['expense','income']) type: 'expense' | 'income';
  @IsOptional() @IsDateString() transactionDate: string;
  @IsOptional() @IsString() description?: string;
}
