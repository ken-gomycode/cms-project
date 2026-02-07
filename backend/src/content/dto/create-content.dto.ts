import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContentStatus } from '@prisma/client';

/**
 * DTO for creating content
 * Includes validation for all content fields
 */
export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus = ContentStatus.DRAFT;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[] = [];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[] = [];

  @IsUUID()
  @IsOptional()
  featuredImageId?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
