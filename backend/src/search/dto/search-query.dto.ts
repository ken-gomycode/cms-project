import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContentStatus } from '@prisma/client';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * DTO for search queries
 * Extends pagination with search-specific filters
 */
export class SearchQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  tagId?: string;
}
