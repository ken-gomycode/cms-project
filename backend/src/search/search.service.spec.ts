import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus } from '@prisma/client';

import { SortOrder } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';

import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Technology',
    slug: 'technology',
  };

  const mockTag = {
    id: 'tag-1',
    name: 'JavaScript',
    slug: 'javascript',
  };

  const mockContent = {
    id: 'content-1',
    title: 'Introduction to JavaScript',
    slug: 'introduction-to-javascript',
    excerpt: 'Learn the basics of JavaScript programming',
    status: ContentStatus.PUBLISHED,
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    author: mockUser,
    categories: [{ category: mockCategory }],
    tags: [{ tag: mockTag }],
    featuredImage: {
      id: 'img-1',
      url: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      altText: 'JavaScript Logo',
    },
  };

  const mockPrismaService = {
    content: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search content with query string', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([mockContent]);
      mockPrismaService.content.count.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Introduction to JavaScript');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);

      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'JavaScript', mode: 'insensitive' } },
            { body: { contains: 'JavaScript', mode: 'insensitive' } },
            { excerpt: { contains: 'JavaScript', mode: 'insensitive' } },
          ],
          status: ContentStatus.PUBLISHED,
        },
        skip: 0,
        take: 10,
        orderBy: { publishedAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should search without query string (list all)', async () => {
      const dto: SearchQueryDto = {
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([mockContent]);
      mockPrismaService.content.count.mockResolvedValue(1);

      const result = await service.search(dto);

      expect(result.data).toHaveLength(1);
      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          status: ContentStatus.PUBLISHED,
        },
        skip: 0,
        take: 10,
        orderBy: { publishedAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      const dto: SearchQueryDto = {
        status: ContentStatus.DRAFT,
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);
      mockPrismaService.content.count.mockResolvedValue(0);

      await service.search(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.DRAFT,
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      const dto: SearchQueryDto = {
        categoryId: 'cat-1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([mockContent]);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.search(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: {
                categoryId: 'cat-1',
              },
            },
          }),
        }),
      );
    });

    it('should filter by tag', async () => {
      const dto: SearchQueryDto = {
        tagId: 'tag-1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([mockContent]);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.search(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: {
              some: {
                tagId: 'tag-1',
              },
            },
          }),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        status: ContentStatus.PUBLISHED,
        categoryId: 'cat-1',
        tagId: 'tag-1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([mockContent]);
      mockPrismaService.content.count.mockResolvedValue(1);

      await service.search(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            status: ContentStatus.PUBLISHED,
            categories: expect.any(Object),
            tags: expect.any(Object),
          }),
        }),
      );
    });

    it('should handle pagination', async () => {
      const dto: SearchQueryDto = {
        page: 2,
        limit: 5,
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);
      mockPrismaService.content.count.mockResolvedValue(10);

      const result = await service.search(dto);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should use custom sorting', async () => {
      const dto: SearchQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: SortOrder.ASC,
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);
      mockPrismaService.content.count.mockResolvedValue(0);

      await service.search(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should return empty results when no content found', async () => {
      const dto: SearchQueryDto = {
        q: 'NonexistentTerm',
        page: 1,
        limit: 10,
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);
      mockPrismaService.content.count.mockResolvedValue(0);

      const result = await service.search(dto);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('searchFullText', () => {
    it('should search using full-text search with query', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript programming',
        page: 1,
        limit: 10,
      };

      const mockResults = [{ ...mockContent, rank: 0.5 }];
      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.searchFullText(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].rank).toBe(0.5);
      expect(result.meta.total).toBe(1);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ts_rank'),
        ContentStatus.PUBLISHED,
        'JavaScript & programming',
        10,
        0,
      );
    });

    it('should search without query using basic ordering', async () => {
      const dto: SearchQueryDto = {
        page: 1,
        limit: 10,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([mockContent])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      const result = await service.searchFullText(dto);

      expect(result.data).toHaveLength(1);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        ContentStatus.PUBLISHED,
        10,
        0,
      );
    });

    it('should filter by category in full-text search', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        categoryId: 'cat-1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([mockContent])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      await service.searchFullText(dto);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ContentCategory'),
        ContentStatus.PUBLISHED,
        'cat-1',
        'JavaScript',
        10,
        0,
      );
    });

    it('should filter by tag in full-text search', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        tagId: 'tag-1',
        page: 1,
        limit: 10,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([mockContent])
        .mockResolvedValueOnce([{ count: BigInt(1) }]);

      await service.searchFullText(dto);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ContentTag'),
        ContentStatus.PUBLISHED,
        'tag-1',
        'JavaScript',
        10,
        0,
      );
    });

    it('should filter by status in full-text search', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        status: ContentStatus.DRAFT,
        page: 1,
        limit: 10,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.searchFullText(dto);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        ContentStatus.DRAFT,
        'JavaScript',
        10,
        0,
      );
    });

    it('should handle pagination in full-text search', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 3,
        limit: 5,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(15) }]);

      const result = await service.searchFullText(dto);

      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(3);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        ContentStatus.PUBLISHED,
        'JavaScript',
        5,
        10,
      );
    });

    it('should sanitize search query for full-text', async () => {
      const dto: SearchQueryDto = {
        q: '  multiple   spaces   here  ',
        page: 1,
        limit: 10,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.searchFullText(dto);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        ContentStatus.PUBLISHED,
        'multiple & spaces & here',
        10,
        0,
      );
    });

    it('should use custom sorting in full-text search without query', async () => {
      const dto: SearchQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: SortOrder.ASC,
      };

      mockPrismaService.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: BigInt(0) }]);

      await service.searchFullText(dto);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c."createdAt" ASC'),
        ContentStatus.PUBLISHED,
        10,
        0,
      );
    });
  });

  describe('suggest', () => {
    it('should return autocomplete suggestions', async () => {
      const dto: SuggestQueryDto = {
        q: 'Ja',
      };

      const mockSuggestions = [
        {
          id: 'content-1',
          title: 'JavaScript Basics',
          slug: 'javascript-basics',
        },
        {
          id: 'content-2',
          title: 'Java Programming',
          slug: 'java-programming',
        },
      ];

      mockPrismaService.content.findMany.mockResolvedValue(mockSuggestions);

      const result = await service.suggest(dto);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('JavaScript Basics');
      expect(result[1].title).toBe('Java Programming');

      expect(prisma.content.findMany).toHaveBeenCalledWith({
        where: {
          status: ContentStatus.PUBLISHED,
          title: {
            startsWith: 'Ja',
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
    });

    it('should limit suggestions to 5 results', async () => {
      const dto: SuggestQueryDto = {
        q: 'J',
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);

      await service.suggest(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should only return published content', async () => {
      const dto: SuggestQueryDto = {
        q: 'Test',
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);

      await service.suggest(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should return empty array when no suggestions found', async () => {
      const dto: SuggestQueryDto = {
        q: 'XYZ',
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);

      const result = await service.suggest(dto);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should use case-insensitive search', async () => {
      const dto: SuggestQueryDto = {
        q: 'JAVA',
      };

      mockPrismaService.content.findMany.mockResolvedValue([]);

      await service.suggest(dto);

      expect(prisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });
  });
});
