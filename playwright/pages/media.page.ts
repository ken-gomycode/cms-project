import { Page, Locator, expect } from '@playwright/test';

export class MediaLibraryPage {
  readonly uploadButton: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly searchInput: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkDeleteButton: Locator;

  constructor(readonly page: Page) {
    this.uploadButton = page.locator('button').filter({ hasText: 'Upload' }).first();
    // View toggle buttons have text "Grid" and "List"
    this.gridViewButton = page.locator('button').filter({ hasText: 'Grid' }).first();
    this.listViewButton = page.locator('button').filter({ hasText: 'List' }).first();
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    this.selectAllCheckbox = page.locator('input[type="checkbox"]').first();
    this.bulkDeleteButton = page.locator('button').filter({ hasText: 'Delete Selected' }).first();
  }

  async goto() {
    await this.page.goto('/admin/media');
    await expect(this.page.locator('h1').filter({ hasText: 'Media' })).toBeVisible({ timeout: 15000 });
  }

  async openUploadModal() {
    await this.uploadButton.click();
    await expect(this.page.getByRole('heading', { name: 'Upload Media' })).toBeVisible();
  }

  async uploadFile(filePath: string) {
    await this.openUploadModal();

    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await this.page.waitForTimeout(2000);

    // Close modal
    const closeBtn = this.page.locator('button').filter({ hasText: 'Cancel' }).first();
    await closeBtn.click();
  }

  async switchToGridView() {
    await this.gridViewButton.click();
    await this.page.waitForTimeout(500);
  }

  async switchToListView() {
    await this.listViewButton.click();
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clickMediaItem(altText: string) {
    const item = this.page.locator('img[alt*="' + altText + '"]').first();
    await item.click();
    await expect(this.page.getByRole('heading', { name: 'Edit Media' })).toBeVisible();
  }

  async selectAllMedia() {
    await this.selectAllCheckbox.check();
  }

  async bulkDelete() {
    await this.bulkDeleteButton.click();
    // ConfirmDialog uses "Delete All" as confirm text for bulk delete
    const confirmBtn = this.page.locator('button').filter({ hasText: /Delete/ }).last();
    await confirmBtn.click();
  }

  async expectMediaVisible(altText: string) {
    await expect(this.page.locator('img[alt*="' + altText + '"]').first()).toBeVisible({ timeout: 5000 });
  }
}
