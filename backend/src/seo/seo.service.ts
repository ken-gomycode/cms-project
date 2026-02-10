import { Injectable, NotFoundException } from '@nestjs/common';
import { SeoMetadata } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSeoDto } from './dto/create-seo.dto';

/**
 * SEO Service
 * Manages SEO metadata for content including creation, retrieval, and deletion
 * Supports auto-generation of SEO metadata from content
 */
@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update SEO metadata for content
   * If no data provided, auto-generates from content
   * - metaTitle: First 60 chars of content title
   * - metaDescription: First 160 chars of excerpt or body
   */
  async createOrUpdate(contentId: string, dto: CreateSeoDto): Promise<SeoMetadata> {
    // Validate that content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    // Auto-generate metadata if not provided
    const metaTitle = dto.metaTitle || this.generateMetaTitle(content.title);
    const metaDescription =
      dto.metaDescription || this.generateMetaDescription(content.excerpt || content.body);

    // Upsert SEO metadata
    const seoMetadata = await this.prisma.seoMetadata.upsert({
      where: { contentId },
      update: {
        metaTitle: dto.metaTitle !== undefined ? dto.metaTitle : metaTitle,
        metaDescription: dto.metaDescription !== undefined ? dto.metaDescription : metaDescription,
        canonicalUrl: dto.canonicalUrl,
        ogTitle: dto.ogTitle,
        ogDescription: dto.ogDescription,
        ogImage: dto.ogImage,
        robots: dto.robots,
        structuredData: dto.structuredData,
      },
      create: {
        contentId,
        metaTitle,
        metaDescription,
        canonicalUrl: dto.canonicalUrl,
        ogTitle: dto.ogTitle,
        ogDescription: dto.ogDescription,
        ogImage: dto.ogImage,
        robots: dto.robots,
        structuredData: dto.structuredData,
      },
    });

    return seoMetadata;
  }

  /**
   * Find SEO metadata by content ID
   * Throws NotFoundException if not found
   */
  async findByContentId(contentId: string): Promise<SeoMetadata> {
    // First validate content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    const seoMetadata = await this.prisma.seoMetadata.findUnique({
      where: { contentId },
    });

    if (!seoMetadata) {
      throw new NotFoundException(`SEO metadata for content ${contentId} not found`);
    }

    return seoMetadata;
  }

  /**
   * Delete SEO metadata for content
   * Throws NotFoundException if SEO metadata doesn't exist
   */
  async remove(contentId: string): Promise<void> {
    const seoMetadata = await this.prisma.seoMetadata.findUnique({
      where: { contentId },
    });

    if (!seoMetadata) {
      throw new NotFoundException(`SEO metadata for content ${contentId} not found`);
    }

    await this.prisma.seoMetadata.delete({
      where: { contentId },
    });
  }

  /**
   * Generate metaTitle from content title (max 60 chars)
   */
  private generateMetaTitle(title: string): string {
    if (title.length <= 60) {
      return title;
    }
    return title.substring(0, 57) + '...';
  }

  /**
   * Generate metaDescription from excerpt or body (max 160 chars)
   */
  private generateMetaDescription(text: string): string {
    // Strip HTML tags if present
    const plainText = text.replace(/<[^>]*>/g, '');

    if (plainText.length <= 160) {
      return plainText;
    }
    return plainText.substring(0, 157) + '...';
  }
}
