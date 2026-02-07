# Search Module

This module provides full-text search capabilities for content in the CMS.

## Features

- **Basic Search**: Uses Prisma's `contains` operator with OR logic across title, body, and excerpt fields
- **Full-Text Search**: Uses PostgreSQL's `tsvector` with GIN index for optimized full-text search
- **Autocomplete**: Prefix matching for search suggestions
- **Filters**: Support for status, category, and tag filters
- **Pagination**: Standard pagination support
- **Ranking**: Search results are ranked by relevance using `ts_rank`

## API Endpoints

### Search Content

```http
GET /search?q=keyword&category=uuid&tag=uuid&status=PUBLISHED&page=1&limit=10
```

**Query Parameters:**
- `q` (optional): Search query string
- `categoryId` (optional): Filter by category UUID
- `tagId` (optional): Filter by tag UUID
- `status` (optional): Filter by content status (DRAFT, PUBLISHED, ARCHIVED, SCHEDULED)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Results per page
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional, default: desc): Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Article Title",
      "slug": "article-title",
      "excerpt": "Article excerpt...",
      "status": "PUBLISHED",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "author": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe"
      },
      "categories": [...],
      "tags": [...],
      "featuredImage": {...},
      "rank": 0.5
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Get Autocomplete Suggestions

```http
GET /search/suggest?q=keyword
```

**Query Parameters:**
- `q` (required, min: 2 characters): Search prefix

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Article Title",
    "slug": "article-title"
  }
]
```

Returns top 5 published articles matching the prefix.

## Implementation Details

### Basic Search

The basic search uses Prisma's query builder with case-insensitive `contains` filters:

```typescript
where: {
  OR: [
    { title: { contains: query, mode: 'insensitive' } },
    { body: { contains: query, mode: 'insensitive' } },
    { excerpt: { contains: query, mode: 'insensitive' } }
  ]
}
```

### Full-Text Search

The full-text search uses PostgreSQL's native full-text search capabilities:

1. **Search Vector**: A `tsvector` column that stores indexed tokens
2. **GIN Index**: Fast inverted index for full-text queries
3. **Trigger**: Automatically updates `search_vector` on insert/update
4. **Ranking**: Results ranked by `ts_rank` for relevance

The search vector assigns different weights:
- Title: Weight A (highest)
- Excerpt: Weight B (medium)
- Body: Weight C (lowest)

### Migration

The migration `20260207232054_add_fulltext_search` creates:
- `search_vector` column of type `tsvector`
- GIN index on `search_vector`
- Trigger function `update_content_search_vector()`
- Trigger `content_search_vector_update` that fires on INSERT/UPDATE

### Fallback Mechanism

The search controller tries full-text search first and falls back to basic search if the `search_vector` column doesn't exist:

```typescript
try {
  return await this.searchService.searchFullText(dto);
} catch (error) {
  return await this.searchService.search(dto);
}
```

## Testing

The module includes comprehensive tests:

- **Unit Tests**: `search.service.spec.ts` - Tests for SearchService methods
- **Integration Tests**: `search.controller.spec.ts` - Tests for SearchController endpoints
- **E2E Tests**: `search.e2e.spec.ts` - End-to-end API tests

Run tests:
```bash
npm test search
```

## Performance

- Full-text search is optimized for large datasets using GIN indexes
- The `search_vector` column is automatically maintained by database triggers
- Search queries use parameterized queries to prevent SQL injection
- Results are paginated to limit memory usage

## Future Enhancements

- [ ] Add support for phrase matching
- [ ] Implement search highlighting
- [ ] Add faceted search (aggregations by category/tag)
- [ ] Support for synonym search
- [ ] Search analytics and logging
- [ ] Multi-language support with different text search configurations
