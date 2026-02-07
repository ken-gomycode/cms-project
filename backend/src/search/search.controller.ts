import { Controller, Get, Query } from '@nestjs/common';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';
import { SearchResult, SearchService, SuggestionResult } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search content
   * GET /search?q=keyword&category=uuid&tag=uuid&page=1&limit=10
   * Uses full-text search when available, falls back to basic search
   */
  @Get()
  async search(@Query() dto: SearchQueryDto): Promise<PaginatedResponseDto<SearchResult>> {
    try {
      // Try full-text search first (will fail if tsvector column doesn't exist)
      return await this.searchService.searchFullText(dto);
    } catch (error) {
      // Fallback to basic search if full-text search is not available
      return await this.searchService.search(dto);
    }
  }

  /**
   * Get autocomplete suggestions
   * GET /search/suggest?q=keyword
   * Returns top 5 prefix matches for autocomplete
   */
  @Get('suggest')
  async suggest(@Query() dto: SuggestQueryDto): Promise<SuggestionResult[]> {
    return await this.searchService.suggest(dto);
  }
}
