import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContentStatus } from '@prisma/client';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * DTO for filtering content
 * Extends pagination with content-specific filters
 */
export class ContentFilterDto extends PaginationQueryDto {
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsUUID()
  @IsOptional()
  authorId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  tagId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
