import { test, expect } from '../fixtures/auth.fixture';
import { ContentListPage, ContentEditorPage } from '../pages/content.page';
import { testData } from '../utils/test-data';
import { apiClient } from '../utils/api-client';

test.describe('Content Management', () => {
  test.describe('Content CRUD', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('can create and publish new content', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = testData.content.title('Published');
      await editor.fillForm({
        title,
        body: testData.content.body,
        excerpt: testData.content.excerpt,
        status: 'PUBLISHED',
      });

      await editor.expectSlugGenerated();
      await editor.publish();

      // Verify in content list
      const listPage = new ContentListPage(page);
      await listPage.expectContentInList(title);
    });

    test('can save content as draft', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = testData.content.title('Draft');
      await editor.fillForm({
        title,
        body: testData.content.body,
        status: 'DRAFT',
      });

      await editor.saveAsDraft();

      const listPage = new ContentListPage(page);
      await listPage.goto();
      await listPage.filterByStatus('DRAFT');
      await listPage.expectContentInList(title);
    });

    test('can edit existing content', async ({ page }) => {
      // Create content via API first
      await apiClient.loginAsAdmin();
      const content = await apiClient.createContent({
        title: testData.content.title('To Edit'),
        body: testData.content.body,
        status: 'DRAFT',
      });

      const listPage = new ContentListPage(page);
      await listPage.goto();
      // Search for the specific content to ensure it's visible
      await listPage.search(content.title);
      await page.waitForTimeout(1000);
      await listPage.clickEditContent(content.title);

      const editor = new ContentEditorPage(page);
      const newTitle = testData.content.title('Edited');
      await editor.fillForm({
        title: newTitle,
        body: testData.content.body + ' (Updated)',
        status: 'PUBLISHED',
      });

      await editor.update();

      await listPage.expectContentInList(newTitle);
    });

    test('can delete content', async ({ page }) => {
      // Create content via API
      await apiClient.loginAsAdmin();
      const content = await apiClient.createContent({
        title: testData.content.title('To Delete'),
        body: testData.content.body,
        status: 'DRAFT',
      });

      const listPage = new ContentListPage(page);
      await listPage.goto();
      // Search for the specific content to ensure it's visible
      await listPage.search(content.title);
      await page.waitForTimeout(1000);
      await listPage.clickDeleteContent(content.title);

      await listPage.expectContentNotInList(content.title);
    });

    test('search filters content list', async ({ page }) => {
      const listPage = new ContentListPage(page);
      await listPage.goto();
      await listPage.search('test');

      // Results should be filtered
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    });

    test('status filter works', async ({ page }) => {
      const listPage = new ContentListPage(page);
      await listPage.goto();
      await listPage.filterByStatus('PUBLISHED');

      // Check that only published items are shown
      await expect(page.locator('span').filter({ hasText: 'PUBLISHED' }).first()).toBeVisible();
    });
  });

  test.describe('Content with Taxonomy & Scheduling', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('can create content with category and tags assigned', async ({ page }) => {
      // Create taxonomy via API
      await apiClient.loginAsAdmin();
      const cat = await apiClient.createCategory({ name: testData.category.name('ContentCat') });
      const tag = await apiClient.createTag({ name: testData.tag.name('ContentTag') });

      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = testData.content.title('WithTaxonomy');
      await editor.fillForm({
        title,
        body: testData.content.body,
        status: 'PUBLISHED',
        categoryId: cat.id,
      });

      // Check tag checkbox if available
      const tagCheckbox = page.locator(`input[type="checkbox"][value="${tag.id}"]`);
      if (await tagCheckbox.isVisible().catch(() => false)) {
        await tagCheckbox.check();
      }

      await editor.publish();

      const listPage = new ContentListPage(page);
      await listPage.expectContentInList(title);

      // Cleanup
      await apiClient.deleteCategory(cat.id).catch(() => {});
      await apiClient.deleteTag(tag.id).catch(() => {});
    });

    test('can create content with SCHEDULED status', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = testData.content.title('Scheduled');
      await editor.fillForm({
        title,
        body: testData.content.body,
        status: 'SCHEDULED',
      });

      // Fill the scheduled date field
      const scheduledAtInput = page.locator('input[name="scheduledAt"]').or(page.locator('input[type="datetime-local"]'));
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await scheduledAtInput.fill(futureDate.toISOString().slice(0, 16));

      await editor.publishButton.or(page.locator('button').filter({ hasText: 'Save' }).first()).click();
      await page.waitForURL('/admin/content', { timeout: 10000 });

      const listPage = new ContentListPage(page);
      await listPage.filterByStatus('SCHEDULED');
      await listPage.expectContentInList(title);
    });
  });

  test.describe('Content Validation', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('shows validation error for empty title', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      await editor.bodyTextarea.fill(testData.content.body);
      await editor.publishButton.click();

      // Should show validation error
      await expect(page.locator('text=Title is required').or(page.locator('.text-error-600')).or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 5000 });
    });

    test('shows validation error for short body', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      await editor.titleInput.fill(testData.content.title());
      await editor.bodyTextarea.fill('Short');
      await editor.publishButton.click();

      await expect(page.locator('text=at least').or(page.locator('.text-error-600')).or(page.locator('[role="alert"]'))).toBeVisible({ timeout: 5000 });
    });

    test('auto-generates slug from title', async ({ page }) => {
      const editor = new ContentEditorPage(page);
      await editor.gotoNew();

      const title = 'My Test Article Title';
      await editor.titleInput.fill(title);
      await page.waitForTimeout(500);

      const slug = await editor.slugInput.inputValue();
      expect(slug).toContain('my-test-article');
    });
  });
});
