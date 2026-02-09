import { test, expect } from '@playwright/test';
import { apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';

// Helper to unwrap { data: ..., statusCode, timestamp } API responses
function unwrap(json: Record<string, unknown>): unknown {
  return json.data !== undefined ? json.data : json;
}

test.describe('Search Module', () => {
  const uniqueKeyword = `UniqueSearch${Date.now()}`;
  let contentId: string;
  let categoryId: string;
  let tagId: string;

  test.beforeAll(async () => {
    await apiClient.loginAsAdmin();

    // Create a category and tag for filtering
    const cat = await apiClient.createCategory({
      name: testData.category.name('SearchCat'),
    });
    categoryId = cat.id;

    const tag = await apiClient.createTag({
      name: testData.tag.name('SearchTag'),
    });
    tagId = tag.id;

    // Create searchable content with the unique keyword
    const content = await apiClient.createContent({
      title: `${uniqueKeyword} Article`,
      body: `This is a test article containing the keyword ${uniqueKeyword} for search testing.`,
      status: 'PUBLISHED',
      categoryIds: [categoryId],
      tagIds: [tagId],
    });
    contentId = content.id;
  });

  test.afterAll(async () => {
    await apiClient.loginAsAdmin();
    await apiClient.deleteContent(contentId).catch(() => {});
    await apiClient.deleteCategory(categoryId).catch(() => {});
    await apiClient.deleteTag(tagId).catch(() => {});
  });

  test('search returns matching content', async () => {
    const res = await apiClient.search(uniqueKeyword);
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    // Search returns { data: [...], meta: {...} } inside the wrapper
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(1);

    const found = items.some((item: any) =>
      item.title.includes(uniqueKeyword)
    );
    expect(found).toBeTruthy();
  });

  test('search returns empty for non-matching query', async () => {
    const res = await apiClient.search('ZZZNONEXISTENT999');
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBe(0);
  });

  test('search supports pagination', async () => {
    const res = await apiClient.search(uniqueKeyword, { page: 1, limit: 2 });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    // Should have pagination metadata
    const meta = inner.meta ?? inner.pagination;
    expect(meta).toBeDefined();
  });

  test('search can filter by category', async () => {
    const res = await apiClient.search(uniqueKeyword, { categoryId });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  test('search can filter by tag', async () => {
    const res = await apiClient.search(uniqueKeyword, { tagId });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  test('suggest returns matching titles', async () => {
    const res = await apiClient.searchSuggest(uniqueKeyword.slice(0, 10));
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const suggestions = unwrap(json);
    const items = Array.isArray(suggestions)
      ? suggestions
      : (suggestions as Record<string, unknown>).data ?? (suggestions as Record<string, unknown>).suggestions ?? [];
    expect((items as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  test('suggest requires minimum 2 characters', async () => {
    const res = await apiClient.searchSuggest('U');
    expect(res.ok).toBeFalsy();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
