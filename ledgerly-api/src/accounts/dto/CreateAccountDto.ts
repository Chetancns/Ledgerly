import { IsString, IsOptional, IsIn } from 'class-validator';
import type { AccountType} from '../account.entity'

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['bank','cash','credit_card','wallet']) // Ensures the value is exactly 'bank'
  type: AccountType;

  @IsString()
  @IsOptional()
  balance?: string; // optional property
}