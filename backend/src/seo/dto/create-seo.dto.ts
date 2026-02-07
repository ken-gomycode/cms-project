import { IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * DTO for creating or updating SEO metadata
 * All fields are optional to allow partial updates and auto-generation
 */
export class CreateSeoDto {
  @IsString()
  @MaxLength(60)
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  metaDescription?: string;

  @IsUrl()
  @IsOptional()
  canonicalUrl?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  ogTitle?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  ogDescription?: string;

  @IsUrl()
  @IsOptional()
  ogImage?: string;

  @IsString()
  @IsOptional()
  robots?: string;

  @IsObject()
  @IsOptional()
  structuredData?: any;
}
