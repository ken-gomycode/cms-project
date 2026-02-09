import { Page, Locator, expect } from '@playwright/test';

export class CategoriesPage {
  readonly newCategoryButton: Locator;
  readonly dataTable: Locator;
  readonly searchInput: Locator;

  constructor(readonly page: Page) {
    this.newCategoryButton = page.locator('button').filter({ hasText: 'New Category' }).first();
    this.dataTable = page.locator('table').first();
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
  }

  async goto() {
    await this.page.goto('/admin/categories');
    await expect(this.page.locator('h1').filter({ hasText: 'Categories' })).toBeVisible({ timeout: 15000 });
  }

  async clickNewCategory() {
    await this.newCategoryButton.click();
    await expect(this.page.getByRole('heading', { name: 'Create Category' })).toBeVisible();
  }

  async fillCategoryForm(data: { name: string; description?: string; parentId?: string }) {
    await this.page.fill('#create-name', data.name);

    if (data.description) {
      await this.page.fill('#create-description', data.description);
    }

    if (data.parentId) {
      await this.page.selectOption('#create-parent', data.parentId);
    }
  }

  async saveCategory() {
    const saveBtn = this.page.locator('button').filter({ hasText: 'Create Category' }).first();
    await saveBtn.click();
    await this.page.waitForTimeout(500);
  }

  async deleteCategory(name: string) {
    const row = this.page.locator('tr').filter({ hasText: name });
    const deleteBtn = row.locator('button[aria-label="Delete category"]').first();
    await deleteBtn.click();

    // ConfirmDialog uses "Delete" as confirm button text
    const confirmBtn = this.page.locator('button').filter({ hasText: 'Delete' }).last();
    await confirmBtn.click();
  }

  async expectCategoryInList(name: string) {
    await expect(this.page.locator('td').filter({ hasText: name }).first()).toBeVisible({ timeout: 5000 });
  }
}

export class TagsPage {
  readonly newTagButton: Locator;
  readonly dataTable: Locator;
  readonly searchInput: Locator;

  constructor(readonly page: Page) {
    this.newTagButton = page.locator('button').filter({ hasText: 'New Tag' }).first();
    this.dataTable = page.locator('table').first();
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
  }

  async goto() {
    await this.page.goto('/admin/tags');
    await expect(this.page.locator('h1').filter({ hasText: 'Tags' })).toBeVisible({ timeout: 15000 });
  }

  async clickNewTag() {
    await this.newTagButton.click();
    await expect(this.page.getByRole('heading', { name: 'Create Tag' })).toBeVisible();
  }

  async fillTagForm(data: { name: string }) {
    await this.page.fill('#create-name', data.name);
    // Wait for slug auto-generation
    await this.page.waitForTimeout(300);
  }

  async saveTag() {
    const saveBtn = this.page.locator('button').filter({ hasText: 'Create Tag' }).first();
    await saveBtn.click();
    await this.page.waitForTimeout(500);
  }

  async deleteTag(name: string) {
    const row = this.page.locator('tr').filter({ hasText: name });
    const deleteBtn = row.locator('button[aria-label="Delete tag"]').first();
    await deleteBtn.click();

    // ConfirmDialog uses "Delete" as confirm button text
    const confirmBtn = this.page.locator('button').filter({ hasText: 'Delete' }).last();
    await confirmBtn.click();
  }

  async expectTagInList(name: string) {
    await expect(this.page.locator('td').filter({ hasText: name }).first()).toBeVisible({ timeout: 5000 });
  }
}
