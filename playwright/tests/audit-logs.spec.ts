import { test, expect } from '@playwright/test';
import { ApiClient, apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';

// Helper to unwrap { data: ..., statusCode, timestamp } API responses
function unwrap(json: Record<string, unknown>): unknown {
  return json.data !== undefined ? json.data : json;
}

test.describe('Audit Logs', () => {
  test.beforeAll(async () => {
    await apiClient.loginAsAdmin();
  });

  test('admin can retrieve audit logs', async () => {
    const res = await apiClient.getAuditLogs();
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    // Should have data array (may be nested { data: [...], pagination })
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(0);
  });

  test('audit logs record content operations', async () => {
    // Create content to trigger an audit log entry
    const content = await apiClient.createContent({
      title: testData.content.title('AuditTest'),
      body: testData.content.body,
      status: 'DRAFT',
    });

    const res = await apiClient.getAuditLogs({ entity: 'CONTENT' });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeGreaterThanOrEqual(1);

    // Cleanup
    await apiClient.deleteContent(content.id).catch(() => {});
  });

  test('can filter audit logs by action', async () => {
    const res = await apiClient.getAuditLogs({ action: 'CREATE' });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const items: { action: string }[] = (Array.isArray(inner) ? inner : (inner.data as any[]) ?? []) as any;

    for (const log of items) {
      expect(log.action).toBe('CREATE');
    }
  });

  test('audit logs support pagination', async () => {
    const res = await apiClient.getAuditLogs({ page: 1, limit: 5 });
    expect(res.ok).toBeTruthy();

    const json = await res.json();
    const inner = unwrap(json) as Record<string, unknown>;
    const meta = inner.meta ?? inner.pagination;
    expect(meta).toBeDefined();

    const items = Array.isArray(inner) ? inner : (inner.data as unknown[]) ?? [];
    expect(items.length).toBeLessThanOrEqual(5);
  });

  test('non-admin users cannot access audit logs', async () => {
    const authorClient = new ApiClient();
    await authorClient.loginAsAuthor();

    const res = await authorClient.getAuditLogs();
    expect(res.status).toBe(403);
  });
});
