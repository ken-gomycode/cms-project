import { credentials } from './test-data';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export class ApiClient {
  private accessToken: string | null = null;

  private unwrap<T>(json: { data?: T } & Record<string, unknown>): T {
    return (json.data !== undefined ? json.data : json) as T;
  }

  async loginAsAdmin(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.admin),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const json = await response.json();
    const data = this.unwrap<AuthResponse>(json);
    this.accessToken = data.accessToken;
  }

  async loginAsAuthor(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.author),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const json = await response.json();
    const data = this.unwrap<AuthResponse>(json);
    this.accessToken = data.accessToken;
  }

  async loginAndGetTokens(creds = credentials.admin): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const json = await response.json();
    const data = this.unwrap<AuthResponse>(json);
    this.accessToken = data.accessToken;
    return data;
  }

  async refreshToken(token: string): Promise<Response> {
    return fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
  }

  async logout(token: string): Promise<Response> {
    return fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: token }),
    });
  }

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  }

  async get(path: string): Promise<Response> {
    return this.request(path, { method: 'GET' });
  }

  async post(path: string, body: unknown): Promise<Response> {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch(path: string, body: unknown): Promise<Response> {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete(path: string): Promise<Response> {
    return this.request(path, { method: 'DELETE' });
  }

  // Content helpers
  async createContent(data: {
    title: string;
    body: string;
    excerpt?: string;
    status?: string;
    tagIds?: string[];
    categoryIds?: string[];
  }): Promise<{ id: string; title: string }> {
    const response = await this.post('/content', data);
    const json = await response.json();
    return this.unwrap(json);
  }

  async deleteContent(id: string): Promise<void> {
    await this.delete(`/content/${id}`);
  }

  // Scheduling helpers
  async scheduleContent(id: string, scheduledAt: string): Promise<Response> {
    return this.post(`/content/${id}/schedule`, { scheduledAt });
  }

  async unscheduleContent(id: string): Promise<Response> {
    return this.post(`/content/${id}/unschedule`, {});
  }

  // Versioning helpers
  async getVersions(contentId: string): Promise<Response> {
    return this.get(`/content/${contentId}/versions`);
  }

  async compareVersions(contentId: string, v1: number, v2: number): Promise<Response> {
    return this.get(`/content/${contentId}/versions/compare?v1=${v1}&v2=${v2}`);
  }

  async rollbackVersion(contentId: string, versionNumber: number): Promise<Response> {
    return this.post(`/content/${contentId}/versions/${versionNumber}/rollback`, {});
  }

  // Search helpers
  async search(query: string, filters?: { categoryId?: string; tagId?: string; page?: number; limit?: number }): Promise<Response> {
    const params = new URLSearchParams({ q: query });
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.tagId) params.set('tagId', filters.tagId);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    return this.get(`/search?${params.toString()}`);
  }

  async searchSuggest(query: string): Promise<Response> {
    return this.get(`/search/suggest?q=${encodeURIComponent(query)}`);
  }

  // Comment helpers
  async createComment(data: {
    body: string;
    authorName: string;
    authorEmail: string;
    contentId: string;
  }): Promise<Response> {
    // Public endpoint - no auth header needed
    return fetch(`${API_URL}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async batchModerateComments(ids: string[], status: string): Promise<Response> {
    return this.patch('/comments/batch-moderate', { ids, status });
  }

  // Audit log helpers
  async getAuditLogs(filters?: { entity?: string; action?: string; page?: number; limit?: number }): Promise<Response> {
    const params = new URLSearchParams();
    if (filters?.entity) params.set('entity', filters.entity);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return this.get(`/audit-logs${qs ? `?${qs}` : ''}`);
  }

  // Media helpers
  async uploadMedia(filePath: string): Promise<Response> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Determine MIME type from extension
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    const formData = new FormData();
    const file = new File([fileBuffer], fileName, { type: mimeType });
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    // Do NOT set Content-Type — fetch sets it with the boundary for multipart
    return fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  // Category helpers
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<{ id: string }> {
    const response = await this.post('/categories', data);
    const json = await response.json();
    return this.unwrap(json);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.delete(`/categories/${id}`);
  }

  // Tag helpers
  async createTag(data: { name: string; slug?: string }): Promise<{ id: string }> {
    const response = await this.post('/tags', data);
    const json = await response.json();
    return this.unwrap(json);
  }

  async deleteTag(id: string): Promise<void> {
    await this.delete(`/tags/${id}`);
  }

  // Cleanup helpers
  async cleanupTestData(prefix: string): Promise<void> {
    // Clean up test content
    const contentRes = await this.get('/content?limit=100');
    const content = await contentRes.json();
    for (const item of content.data || []) {
      if (item.title?.includes('Test')) {
        await this.deleteContent(item.id);
      }
    }

    // Clean up test categories
    const catRes = await this.get('/categories');
    const categories = await catRes.json();
    for (const cat of categories || []) {
      if (cat.name?.includes('Test')) {
        await this.deleteCategory(cat.id);
      }
    }

    // Clean up test tags
    const tagRes = await this.get('/tags?limit=100');
    const tags = await tagRes.json();
    for (const tag of tags.data || []) {
      if (tag.name?.includes('Test')) {
        await this.deleteTag(tag.id);
      }
    }
  }
}

export const apiClient = new ApiClient();
