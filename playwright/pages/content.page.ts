import { Page, Locator, expect } from '@playwright/test';

export class ContentListPage {
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly newContentButton: Locator;
  readonly dataTable: Locator;
  readonly pagination: Locator;

  constructor(readonly page: Page) {
    this.searchInput = page.locator('input[placeholder*="Search"], input#search');
    this.statusFilter = page.locator('select#status-filter');
    this.newContentButton = page.locator('button').filter({ hasText: 'New Post' }).first();
    this.dataTable = page.locator('table').first();
    this.pagination = page.locator('button').filter({ hasText: /Previous|Next/ });
  }

  async goto() {
    await this.page.goto('/admin/content');
    await expect(this.page.locator('h1').filter({ hasText: 'Content' })).toBeVisible({ timeout: 15000 });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async filterByStatus(status: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED' | 'ARCHIVED') {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500);
  }

  async clickNewContent() {
    await this.newContentButton.click();
    await this.page.waitForURL('**/admin/content/new');
  }

  async clickEditContent(title: string) {
    const row = this.page.locator('tr').filter({ hasText: title });
    // ContentList.tsx uses icon-only edit button with aria-label
    const editBtn = row.locator('button[aria-label="Edit content"]').first();
    await editBtn.click();
    await this.page.waitForURL(/\/admin\/content\/.*\/edit/);
  }

  async clickDeleteContent(title: string) {
    const row = this.page.locator('tr').filter({ hasText: title });
    // ContentList.tsx uses icon-only delete button with aria-label
    const deleteBtn = row.locator('button[aria-label="Delete content"]').first();
    await deleteBtn.click();
    // ConfirmDialog uses "Delete" as confirm button text
    const confirmBtn = this.page.locator('button').filter({ hasText: 'Delete' }).last();
    await confirmBtn.click();
  }

  async expectContentInList(title: string) {
    await expect(this.page.locator('td, .title').filter({ hasText: title }).first()).toBeVisible({ timeout: 5000 });
  }

  async expectContentNotInList(title: string) {
    await expect(this.page.locator('td, .title').filter({ hasText: title })).not.toBeVisible();
  }
}

export class ContentEditorPage {
  readonly titleInput: Locator;
  readonly slugInput: Locator;
  readonly bodyTextarea: Locator;
  readonly excerptInput: Locator;
  readonly statusSelect: Locator;
  readonly categorySelect: Locator;
  readonly tagCheckboxes: Locator;
  readonly saveDraftButton: Locator;
  readonly publishButton: Locator;
  readonly updateButton: Locator;

  constructor(readonly page: Page) {
    this.titleInput = page.locator('input[name="title"]');
    this.slugInput = page.locator('input[name="slug"]');
    this.bodyTextarea = page.locator('textarea[name="body"]').or(page.locator('.ProseMirror')).first();
    this.excerptInput = page.locator('textarea[name="excerpt"]').or(page.locator('input[name="excerpt"]'));
    this.statusSelect = page.locator('select[name="status"]');
    this.categorySelect = page.locator('select[name="categoryId"]').or(page.locator('select[name="categoryIds"]'));
    this.tagCheckboxes = page.locator('input[type="checkbox"][name="tagIds"]');
    this.saveDraftButton = page.locator('button').filter({ hasText: 'Save as Draft' }).first();
    this.publishButton = page.locator('button').filter({ hasText: 'Publish' }).first();
    this.updateButton = page.locator('button').filter({ hasText: 'Update' }).first();
  }

  async gotoNew() {
    await this.page.goto('/admin/content/new');
    await expect(this.titleInput).toBeVisible({ timeout: 15000 });
  }

  async fillForm(data: {
    title: string;
    body: string;
    excerpt?: string;
    status?: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';
    categoryId?: string;
    tagIds?: string[];
  }) {
    await this.titleInput.fill(data.title);
    await this.page.waitForTimeout(300); // Wait for slug auto-generation

    await this.bodyTextarea.fill(data.body);

    if (data.excerpt) {
      await this.excerptInput.fill(data.excerpt);
    }

    if (data.status) {
      await this.statusSelect.selectOption(data.status);
    }

    if (data.categoryId) {
      await this.categorySelect.selectOption(data.categoryId);
    }
  }

  async saveAsDraft() {
    await this.saveDraftButton.click();
    await this.page.waitForURL('**/admin/content', { timeout: 10000 });
  }

  async publish() {
    await this.publishButton.click();
    await this.page.waitForURL('**/admin/content', { timeout: 10000 });
  }

  async update() {
    await this.updateButton.click();
    await this.page.waitForURL('**/admin/content', { timeout: 10000 });
  }

  async expectSlugGenerated() {
    const slugValue = await this.slugInput.inputValue();
    expect(slugValue).toBeTruthy();
  }
}
