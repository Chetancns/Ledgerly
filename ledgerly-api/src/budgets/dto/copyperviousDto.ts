import { IsString } from "class-validator";

export class CopyPreviousDto {
  @IsString()
  period: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;
}
