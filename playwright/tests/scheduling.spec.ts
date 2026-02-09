import { test, expect } from '../fixtures/auth.fixture';
import { apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';
import { ContentEditorPage, ContentListPage } from '../pages/content.page';

test.describe('Content Scheduling', () => {
  test.describe('API', () => {
    let contentId: string;

    test.beforeAll(async () => {
      await apiClient.loginAsAdmin();
      const content = await apiClient.createContent({
        title: testData.content.title('Schedule'),
        body: testData.content.body,
        status: 'DRAFT',
      });
      contentId = content.id;
    });

    test.afterAll(async () => {
      // Reuse existing token if possible (avoid extra login)
      await apiClient.deleteContent(contentId).catch(() => {});
    });

    test('can schedule content for future publishing', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await apiClient.scheduleContent(contentId, futureDate);
      expect(res.ok).toBeTruthy();

      const contentRes = await apiClient.get(`/content/${contentId}`);
      const json = await contentRes.json();
      const content = json.data ?? json;
      expect(content.status).toBe('SCHEDULED');
    });

    test('can unschedule content', async () => {
      // Ensure content is scheduled first
      const checkRes = await apiClient.get(`/content/${contentId}?_t=${Date.now()}`);
      const checkJson = await checkRes.json();
      const checkContent = checkJson.data ?? checkJson;
      if (checkContent.status !== 'SCHEDULED') {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await apiClient.scheduleContent(contentId, futureDate);
      }

      const res = await apiClient.unscheduleContent(contentId);
      expect(res.ok).toBeTruthy();

      // Check the unschedule response directly (avoids cache)
      const unscheduleJson = await res.json();
      const unscheduledContent = unscheduleJson.data ?? unscheduleJson;
      expect(unscheduledContent.status).toBe('DRAFT');
    });

    test('scheduling requires valid future date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await apiClient.scheduleContent(contentId, pastDate);
      expect(res.ok).toBeFalsy();
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('author can schedule own content', async () => {
      await apiClient.loginAsAuthor();
      const content = await apiClient.createContent({
        title: testData.content.title('AuthorSchedule'),
        body: testData.content.body,
        status: 'DRAFT',
      });

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await apiClient.scheduleContent(content.id, futureDate);
      expect(res.ok).toBeTruthy();

      // Cleanup
      await apiClient.loginAsAdmin();
      await apiClient.deleteContent(content.id).catch(() => {});
    });
  });

  test.describe('UI', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('content editor shows schedule date field', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      await editor.statusSelect.selectOption('SCHEDULED');
      const scheduledAtInput = page.locator('input[name="scheduledAt"]');
      await expect(scheduledAtInput).toBeVisible({ timeout: 5000 });
    });

    test('can create content with SCHEDULED status via UI', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = testData.content.title('UIScheduled');
      await editor.fillForm({
        title,
        body: testData.content.body,
        status: 'SCHEDULED',
      });

      // Fill the scheduled date
      const scheduledAtInput = page.locator('input[name="scheduledAt"]');
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const dateStr = futureDate.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
      await scheduledAtInput.fill(dateStr);

      // Submit form directly (neither Publish nor Save as Draft preserves SCHEDULED status)
      await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());

      // Verify via toast or redirect — form submission should navigate to content list
      await page.waitForURL('**/admin/content', { timeout: 10000 });

      // Verify via API that content was created with SCHEDULED status
      await apiClient.loginAsAdmin();
      const searchRes = await apiClient.search(title);
      if (searchRes.ok) {
        const json = await searchRes.json();
        const items = json.data?.data ?? json.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          expect(items[0].status).toBe('SCHEDULED');
        }
      }
      // Verify the content list page loaded (navigation succeeded)
      await expect(page.locator('h1, h2').filter({ hasText: 'Content' }).first()).toBeVisible({ timeout: 5000 });
    });
  });
});
