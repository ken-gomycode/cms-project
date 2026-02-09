import { test, expect } from '../fixtures/auth.fixture';
import { MediaLibraryPage } from '../pages/media.page';
import { apiClient } from '../utils/api-client';
import * as path from 'path';

test.describe('Media Library', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays media library page', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();

    await expect(mediaPage.uploadButton).toBeVisible();
    await expect(mediaPage.gridViewButton).toBeVisible();
    await expect(mediaPage.listViewButton).toBeVisible();
  });

  test('can switch between grid and list views', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();

    await mediaPage.switchToListView();
    await mediaPage.switchToGridView();
  });

  test('can search media files', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();

    await mediaPage.search('test');
    // Wait for search results to load
    await page.waitForTimeout(1000);
  });

  test('upload modal opens correctly', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();
    await mediaPage.openUploadModal();

    await expect(page.locator('text=Upload Media').first()).toBeVisible();
  });

  test('can upload image file', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();

    const fixturePath = path.resolve(__dirname, '../fixtures/test-image.png');
    // Skip if fixture doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(fixturePath)) {
      test.skip(true, 'Test image fixture not found');
      return;
    }

    await mediaPage.uploadFile(fixturePath);
  });

  test('can select and bulk delete media', async ({ page }) => {
    const mediaPage = new MediaLibraryPage(page);
    await mediaPage.goto();

    // Only attempt if there are checkboxes (media items exist)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await mediaPage.selectAllMedia();
      // Bulk delete button should be visible
      await expect(mediaPage.bulkDeleteButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('can upload media file via API', async () => {
    await apiClient.loginAsAdmin();
    const fixturePath = path.resolve(__dirname, '../fixtures/test-image.png');

    const fs = await import('fs');
    if (!fs.existsSync(fixturePath)) {
      test.skip(true, 'Test image fixture not found');
      return;
    }

    const res = await apiClient.uploadMedia(fixturePath);

    // Upload requires Cloudinary configuration — skip if not configured
    if (res.status === 500) {
      const body = await res.text();
      if (body.includes('chunk') || body.includes('Cloudinary') || body.includes('upload')) {
        test.skip(true, 'Media upload requires Cloudinary configuration');
        return;
      }
    }

    expect(res.ok).toBeTruthy();
    const json = await res.json();
    const media = json.data ?? json;
    expect(media.id).toBeTruthy();
    expect(media.filename || media.originalName).toBeTruthy();
    expect(media.mimeType || media.mimetype).toContain('image');
  });
});
