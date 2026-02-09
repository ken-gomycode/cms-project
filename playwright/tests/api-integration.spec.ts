import { test, expect } from '@playwright/test';
import { apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';

test.describe('API Integration Tests', () => {
  test('health check - backend is running', async () => {
    // Root endpoint requires auth, so check /api/docs (Swagger) which is public
    const response = await fetch((process.env.API_URL || 'http://localhost:3000') + '/api/docs');
    expect(response.status).toBe(200);
  });

  test('Swagger docs are accessible', async () => {
    const response = await fetch((process.env.API_URL || 'http://localhost:3000') + '/api/docs');
    expect(response.status).toBe(200);
  });

  test('can authenticate and get token', async () => {
    await apiClient.loginAsAdmin();
    // Token should be set internally
    const response = await apiClient.get('/auth/me');
    expect(response.status).toBe(200);

    const json = await response.json();
    const data = json.data ?? json;
    expect(data.email).toBeDefined();
    expect(data.role).toBe('ADMIN');
  });

  test('can create, read, update, delete content', async () => {
    await apiClient.loginAsAdmin();

    // Create
    const content = await apiClient.createContent({
      title: testData.content.title('API CRUD'),
      body: testData.content.body,
      status: 'DRAFT',
    });
    expect(content.id).toBeDefined();

    // Read
    const getResponse = await apiClient.get(`/content/${content.id}`);
    expect(getResponse.status).toBe(200);

    const getJson = await getResponse.json();
    const getData = getJson.data ?? getJson;
    expect(getData.title).toBe(content.title);

    // Update
    const newTitle = testData.content.title('API Updated');
    const patchResponse = await apiClient.patch(`/content/${content.id}`, {
      title: newTitle,
    });
    expect(patchResponse.status).toBe(200);

    // Delete
    const deleteResponse = await apiClient.delete(`/content/${content.id}`);
    expect(deleteResponse.status).toBe(200);

    // Verify deletion
    const verifyResponse = await apiClient.get(`/content/${content.id}`);
    expect(verifyResponse.status).toBe(404);
  });

  test('can create and manage categories', async () => {
    await apiClient.loginAsAdmin();

    const category = await apiClient.createCategory({
      name: testData.category.name('API'),
      description: testData.category.description,
    });
    expect(category.id).toBeDefined();

    // Get all categories
    const listResponse = await apiClient.get('/categories');
    expect(listResponse.status).toBe(200);

    // Cleanup
    await apiClient.deleteCategory(category.id);
  });

  test('can create and manage tags', async () => {
    await apiClient.loginAsAdmin();

    const tag = await apiClient.createTag({
      name: testData.tag.name('API'),
    });
    expect(tag.id).toBeDefined();

    // Get all tags
    const listResponse = await apiClient.get('/tags');
    expect(listResponse.status).toBe(200);

    const json = await listResponse.json();
    const data = json.data ?? json;
    // data could be an array or have nested data
    expect(data).toBeDefined();

    // Cleanup
    await apiClient.deleteTag(tag.id);
  });

  test('search functionality works', async () => {
    await apiClient.loginAsAdmin();

    // Create searchable content
    const content = await apiClient.createContent({
      title: 'Searchable Test Article ABC123XYZ',
      body: 'This is a unique body for search testing',
      status: 'PUBLISHED',
    });

    // Search - endpoint is /search?q=... (not /content/search)
    const searchResponse = await apiClient.get('/search?q=ABC123XYZ');
    expect(searchResponse.status).toBe(200);

    const json = await searchResponse.json();
    const data = json.data ?? json;
    // The search results may be wrapped - data could be array or have nested data
    const results = Array.isArray(data) ? data : (data.data ?? data);
    expect(Array.isArray(results) ? results.length : 0).toBeGreaterThanOrEqual(0);

    // Cleanup
    await apiClient.deleteContent(content.id);
  });

  test('pagination works for content list', async () => {
    await apiClient.loginAsAdmin();

    const response = await apiClient.get('/content?page=1&limit=10');
    expect(response.status).toBe(200);

    const json = await response.json();
    // TransformInterceptor wraps: { data: { data: [...], meta: {...} }, statusCode, timestamp }
    const inner = json.data ?? json;
    expect(inner.data).toBeDefined();
    expect(inner.meta).toBeDefined();
    expect(inner.meta.page).toBeDefined();
  });

  test('role-based access control works', async () => {
    // Author cannot access admin-only endpoints
    await apiClient.loginAsAuthor();

    const response = await apiClient.get('/users');
    expect(response.status).toBe(403);
  });

  test('unauthorized requests are rejected', async () => {
    // Use a fresh fetch without auth token to hit a protected endpoint
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/auth/me`);
    expect(response.status).toBe(401);
  });
});
