import { IsString, IsOptional, MaxLength, Matches, IsArray, IsUUID } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code (e.g., #3B82F6)' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex code (e.g., #3B82F6)' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class MergeTagsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  sourceTagIds: string[];

  @IsUUID('4')
  targetTagId: string;
}

export class BulkDeleteTagsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[];
}
