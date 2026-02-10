import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for creating content
 * Includes validation for all content fields
 */
export class CreateContentDto {
  @ApiProperty({
    description: 'Content title',
    example: 'My First Blog Post',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Content body (HTML or Markdown)',
    example: '<p>This is the body of my blog post...</p>',
  })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Content excerpt/summary',
    example: 'A brief summary of the post',
    required: false,
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    description: 'Content status',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
    required: false,
  })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus = ContentStatus.DRAFT;

  @ApiProperty({
    description: 'Array of category UUIDs',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[] = [];

  @ApiProperty({
    description: 'Array of tag UUIDs',
    example: ['123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[] = [];

  @ApiProperty({
    description: 'Featured image UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  featuredImageId?: string;

  @ApiProperty({
    description: 'Scheduled publish date (ISO 8601 format)',
    example: '2026-03-01T10:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
