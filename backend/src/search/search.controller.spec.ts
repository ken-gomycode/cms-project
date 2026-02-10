import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus } from '@prisma/client';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SortOrder } from '../common/dto/pagination-query.dto';

import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';
import { SearchController } from './search.controller';
import { SearchResult, SearchService, SuggestionResult } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const mockSearchResult: SearchResult = {
    id: 'content-1',
    title: 'Introduction to JavaScript',
    slug: 'introduction-to-javascript',
    excerpt: 'Learn the basics of JavaScript programming',
    status: ContentStatus.PUBLISHED,
    publishedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    author: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
    },
    categories: [
      {
        category: {
          id: 'cat-1',
          name: 'Technology',
          slug: 'technology',
        },
      },
    ],
    tags: [
      {
        tag: {
          id: 'tag-1',
          name: 'JavaScript',
          slug: 'javascript',
        },
      },
    ],
    featuredImage: {
      id: 'img-1',
      url: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      altText: 'JavaScript Logo',
    },
  };

  const mockSuggestion: SuggestionResult = {
    id: 'content-1',
    title: 'JavaScript Basics',
    slug: 'javascript-basics',
  };

  const mockSearchService = {
    search: jest.fn(),
    searchFullText: jest.fn(),
    suggest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results using full-text search', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Introduction to JavaScript');
      expect(result.meta.total).toBe(1);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should fallback to basic search if full-text fails', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockRejectedValue(
        new Error('Column search_vector does not exist'),
      );
      mockSearchService.search.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result).toEqual(paginatedResult);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
      expect(service.search).toHaveBeenCalledWith(dto);
    });

    it('should search without query string', async () => {
      const dto: SearchQueryDto = {
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should search with category filter', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        categoryId: 'cat-1',
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].categories[0].category.id).toBe('cat-1');
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should search with tag filter', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        tagId: 'tag-1',
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tags[0].tag.id).toBe('tag-1');
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should search with status filter', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        status: ContentStatus.PUBLISHED,
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(ContentStatus.PUBLISHED);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should search with all filters combined', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        status: ContentStatus.PUBLISHED,
        categoryId: 'cat-1',
        tagId: 'tag-1',
        page: 2,
        limit: 5,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 10, 2, 5);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.total).toBe(10);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });

    it('should handle pagination correctly', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 3,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([], 25, 3, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(0);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return empty results when no content matches', async () => {
      const dto: SearchQueryDto = {
        q: 'NonexistentTerm',
        page: 1,
        limit: 10,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([], 0, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use custom sorting', async () => {
      const dto: SearchQueryDto = {
        q: 'JavaScript',
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: SortOrder.ASC,
      };

      const paginatedResult = new PaginatedResponseDto<SearchResult>([mockSearchResult], 1, 1, 10);

      mockSearchService.searchFullText.mockResolvedValue(paginatedResult);

      const result = await controller.search(dto);

      expect(result.data).toHaveLength(1);
      expect(service.searchFullText).toHaveBeenCalledWith(dto);
    });
  });

  describe('suggest', () => {
    it('should return autocomplete suggestions', async () => {
      const dto: SuggestQueryDto = {
        q: 'Ja',
      };

      const suggestions = [mockSuggestion];
      mockSearchService.suggest.mockResolvedValue(suggestions);

      const result = await controller.suggest(dto);

      expect(result).toEqual(suggestions);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('JavaScript Basics');
      expect(service.suggest).toHaveBeenCalledWith(dto);
    });

    it('should return multiple suggestions', async () => {
      const dto: SuggestQueryDto = {
        q: 'Ja',
      };

      const suggestions = [
        { id: '1', title: 'JavaScript Basics', slug: 'javascript-basics' },
        { id: '2', title: 'Java Programming', slug: 'java-programming' },
        { id: '3', title: 'JAMStack Guide', slug: 'jamstack-guide' },
      ];

      mockSearchService.suggest.mockResolvedValue(suggestions);

      const result = await controller.suggest(dto);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('JavaScript Basics');
      expect(result[1].title).toBe('Java Programming');
      expect(result[2].title).toBe('JAMStack Guide');
    });

    it('should return empty array when no suggestions found', async () => {
      const dto: SuggestQueryDto = {
        q: 'XYZ',
      };

      mockSearchService.suggest.mockResolvedValue([]);

      const result = await controller.suggest(dto);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle short query strings', async () => {
      const dto: SuggestQueryDto = {
        q: 'ab',
      };

      const suggestions = [mockSuggestion];
      mockSearchService.suggest.mockResolvedValue(suggestions);

      const result = await controller.suggest(dto);

      expect(result).toEqual(suggestions);
      expect(service.suggest).toHaveBeenCalledWith(dto);
    });

    it('should handle case-insensitive suggestions', async () => {
      const dto: SuggestQueryDto = {
        q: 'JAVA',
      };

      const suggestions = [mockSuggestion];
      mockSearchService.suggest.mockResolvedValue(suggestions);

      const result = await controller.suggest(dto);

      expect(result).toHaveLength(1);
      expect(service.suggest).toHaveBeenCalledWith(dto);
    });
  });
});
