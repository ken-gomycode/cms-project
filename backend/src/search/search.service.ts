import { Injectable } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';

import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';

/**
 * Content search result interface
 */
export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  categories: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  featuredImage?: {
    id: string;
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  } | null;
  rank?: number;
}

/**
 * Suggestion result interface
 */
export interface SuggestionResult {
  id: string;
  title: string;
  slug: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search content using Prisma contains with OR logic
   * Supports filters for status, category, and tag
   * Returns paginated results
   */
  async search(dto: SearchQueryDto): Promise<PaginatedResponseDto<SearchResult>> {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ContentWhereInput = {};

    // Search query - search in title, body, and excerpt
    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { body: { contains: dto.q, mode: 'insensitive' } },
        { excerpt: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    // Status filter (default to PUBLISHED for public search)
    if (dto.status) {
      where.status = dto.status;
    } else {
      where.status = ContentStatus.PUBLISHED;
    }

    // Category filter
    if (dto.categoryId) {
      where.categories = {
        some: {
          categoryId: dto.categoryId,
        },
      };
    }

    // Tag filter
    if (dto.tagId) {
      where.tags = {
        some: {
          tagId: dto.tagId,
        },
      };
    }

    // Order by relevance (published date desc for now)
    const orderBy: Prisma.ContentOrderByWithRelationInput =
      dto.sortBy && dto.sortOrder ? { [dto.sortBy]: dto.sortOrder } : { publishedAt: 'desc' };

    // Execute queries in parallel
    const [content, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          categories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          featuredImage: {
            select: {
              id: true,
              url: true,
              thumbnailUrl: true,
              altText: true,
            },
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return new PaginatedResponseDto<SearchResult>(content as SearchResult[], total, page, limit);
  }

  /**
   * Search content using PostgreSQL full-text search
   * Uses ts_query and ts_rank for better relevance
   * Only used when tsvector column exists
   */
  async searchFullText(dto: SearchQueryDto): Promise<PaginatedResponseDto<SearchResult>> {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    // Build filters
    const filters: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter (default to PUBLISHED)
    const status = dto.status || ContentStatus.PUBLISHED;
    filters.push(`c.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    // Category filter
    if (dto.categoryId) {
      filters.push(
        `EXISTS (SELECT 1 FROM "ContentCategory" cc WHERE cc."contentId" = c.id AND cc."categoryId" = $${paramIndex})`,
      );
      params.push(dto.categoryId);
      paramIndex++;
    }

    // Tag filter
    if (dto.tagId) {
      filters.push(
        `EXISTS (SELECT 1 FROM "ContentTag" ct WHERE ct."contentId" = c.id AND ct."tagId" = $${paramIndex})`,
      );
      params.push(dto.tagId);
      paramIndex++;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // If no search query, use basic ordering
    if (!dto.q) {
      const orderBy = dto.sortBy || 'publishedAt';
      const orderDir = dto.sortOrder || 'desc';

      const query = `
        SELECT
          c.id,
          c.title,
          c.slug,
          c.excerpt,
          c.status,
          c."publishedAt",
          c."createdAt",
          json_build_object(
            'id', u.id,
            'firstName', u."firstName",
            'lastName', u."lastName"
          ) as author,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'category', json_build_object(
                  'id', cat.id,
                  'name', cat.name,
                  'slug', cat.slug
                )
              ))
              FROM "ContentCategory" cc
              JOIN "Category" cat ON cc."categoryId" = cat.id
              WHERE cc."contentId" = c.id
            ),
            '[]'::json
          ) as categories,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'tag', json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'slug', t.slug
                )
              ))
              FROM "ContentTag" ct
              JOIN "Tag" t ON ct."tagId" = t.id
              WHERE ct."contentId" = c.id
            ),
            '[]'::json
          ) as tags,
          CASE
            WHEN m.id IS NOT NULL THEN json_build_object(
              'id', m.id,
              'url', m.url,
              'thumbnailUrl', m."thumbnailUrl",
              'altText', m."altText"
            )
            ELSE NULL
          END as "featuredImage"
        FROM "Content" c
        JOIN "User" u ON c."authorId" = u.id
        LEFT JOIN "Media" m ON c."featuredImageId" = m.id
        ${whereClause}
        ORDER BY c."${orderBy}" ${orderDir.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, skip);

      const countQuery = `
        SELECT COUNT(*) as count
        FROM "Content" c
        ${whereClause}
      `;

      const [results, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<SearchResult[]>(query, ...params),
        this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
          countQuery,
          ...params.slice(0, params.length - 2),
        ),
      ]);

      const total = Number(countResult[0].count);

      return new PaginatedResponseDto<SearchResult>(results, total, page, limit);
    }

    // Full-text search with ranking
    const searchQuery = dto.q
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .join(' & ');

    filters.push(`c.search_vector @@ to_tsquery('english', $${paramIndex})`);
    params.push(searchQuery);
    paramIndex++;

    const whereWithSearch = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        c.id,
        c.title,
        c.slug,
        c.excerpt,
        c.status,
        c."publishedAt",
        c."createdAt",
        json_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName"
        ) as author,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'category', json_build_object(
                'id', cat.id,
                'name', cat.name,
                'slug', cat.slug
              )
            ))
            FROM "ContentCategory" cc
            JOIN "Category" cat ON cc."categoryId" = cat.id
            WHERE cc."contentId" = c.id
          ),
          '[]'::json
        ) as categories,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'tag', json_build_object(
                'id', t.id,
                'name', t.name,
                'slug', t.slug
              )
            ))
            FROM "ContentTag" ct
            JOIN "Tag" t ON ct."tagId" = t.id
            WHERE ct."contentId" = c.id
          ),
          '[]'::json
        ) as tags,
        CASE
          WHEN m.id IS NOT NULL THEN json_build_object(
            'id', m.id,
            'url', m.url,
            'thumbnailUrl', m."thumbnailUrl",
            'altText', m."altText"
          )
          ELSE NULL
        END as "featuredImage",
        ts_rank(c.search_vector, to_tsquery('english', $${paramIndex - 1})) as rank
      FROM "Content" c
      JOIN "User" u ON c."authorId" = u.id
      LEFT JOIN "Media" m ON c."featuredImageId" = m.id
      ${whereWithSearch}
      ORDER BY rank DESC, c."publishedAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, skip);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Content" c
      ${whereWithSearch}
    `;

    const [results, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<SearchResult[]>(query, ...params),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        countQuery,
        ...params.slice(0, params.length - 2),
      ),
    ]);

    const total = Number(countResult[0].count);

    return new PaginatedResponseDto<SearchResult>(results, total, page, limit);
  }

  /**
   * Get autocomplete suggestions
   * Returns top 5 prefix matches on title
   */
  async suggest(dto: SuggestQueryDto): Promise<SuggestionResult[]> {
    const results = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        title: {
          startsWith: dto.q,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 5,
    });

    return results;
  }
}
