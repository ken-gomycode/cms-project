import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContentStatus } from '@prisma/client';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * DTO for search queries
 * Extends pagination with search-specific filters
 */
export class SearchQueryDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'javascript tutorial',
    required: false,
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ description: 'Filter by content status', enum: ContentStatus, required: false })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiProperty({ description: 'Filter by category UUID', required: false })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Filter by tag UUID', required: false })
  @IsUUID()
  @IsOptional()
  tagId?: string;
}
