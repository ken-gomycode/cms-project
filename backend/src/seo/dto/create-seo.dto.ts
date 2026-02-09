import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * DTO for creating or updating SEO metadata
 * All fields are optional to allow partial updates and auto-generation
 */
export class CreateSeoDto {
  @ApiProperty({
    description: 'Meta title (max 60 chars)',
    example: 'Best Blog Post Ever',
    maxLength: 60,
    required: false,
  })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({
    description: 'Meta description (max 160 chars)',
    example: 'This is an amazing blog post about...',
    maxLength: 160,
    required: false,
  })
  @IsString()
  @MaxLength(160)
  @IsOptional()
  metaDescription?: string;

  @ApiProperty({
    description: 'Canonical URL',
    example: 'https://example.com/blog/post',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  canonicalUrl?: string;

  @ApiProperty({
    description: 'Open Graph title',
    example: 'Best Blog Post Ever',
    maxLength: 60,
    required: false,
  })
  @IsString()
  @MaxLength(60)
  @IsOptional()
  ogTitle?: string;

  @ApiProperty({
    description: 'Open Graph description',
    example: 'This is an amazing blog post',
    maxLength: 160,
    required: false,
  })
  @IsString()
  @MaxLength(160)
  @IsOptional()
  ogDescription?: string;

  @ApiProperty({
    description: 'Open Graph image URL',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  ogImage?: string;

  @ApiProperty({ description: 'Robots meta tag', example: 'index, follow', required: false })
  @IsString()
  @IsOptional()
  robots?: string;

  @ApiProperty({
    description: 'Structured data JSON-LD',
    example: { '@type': 'Article' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  structuredData?: any;
}
