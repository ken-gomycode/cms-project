import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * DTO for filtering content
 * Extends pagination with content-specific filters
 */
export class ContentFilterDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Filter by content status',
    enum: ContentStatus,
    required: false,
  })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiProperty({
    description: 'Filter by author UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  authorId?: string;

  @ApiProperty({
    description: 'Filter by category UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Filter by tag UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  tagId?: string;

  @ApiProperty({
    description: 'Search in title and body',
    example: 'blog post',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}
