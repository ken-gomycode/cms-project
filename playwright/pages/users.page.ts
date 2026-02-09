import { Page, Locator, expect } from '@playwright/test';

export class UsersPage {
  readonly newUserButton: Locator;
  readonly dataTable: Locator;
  readonly searchInput: Locator;
  readonly roleFilter: Locator;

  constructor(readonly page: Page) {
    this.newUserButton = page.locator('button').filter({ hasText: 'New User' }).first();
    this.dataTable = page.locator('table').first();
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
    // UserManagement.tsx uses a select for role filter with options like "All Roles", "Admin", etc.
    this.roleFilter = page.locator('select').filter({ has: page.locator('option') }).first();
  }

  async goto() {
    await this.page.goto('/admin/users');
    await expect(this.page.locator('h1').filter({ hasText: 'User' })).toBeVisible({ timeout: 15000 });
  }

  async clickNewUser() {
    await this.newUserButton.click();
    await expect(this.page.getByRole('heading', { name: 'Create User' })).toBeVisible();
  }

  async fillUserForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role?: 'ADMIN' | 'AUTHOR' | 'EDITOR';
  }) {
    await this.page.fill('#create-firstName', data.firstName);
    await this.page.fill('#create-lastName', data.lastName);
    await this.page.fill('#create-email', data.email);

    if (data.password) {
      await this.page.fill('#create-password', data.password);
    }

    if (data.role) {
      await this.page.selectOption('#create-role', data.role);
    }
  }

  async saveUser() {
    const saveBtn = this.page.locator('button').filter({ hasText: 'Create User' }).first();
    await saveBtn.click();
    await this.page.waitForTimeout(500);
  }

  async clickEditUser(email: string) {
    const row = this.page.locator('tr').filter({ hasText: email });
    const editBtn = row.locator('button[aria-label="Edit user"]').first();
    await editBtn.click();
    await expect(this.page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
  }

  async clickDeleteUser(email: string) {
    const row = this.page.locator('tr').filter({ hasText: email });
    const deleteBtn = row.locator('button[aria-label="Delete user"]').first();
    await deleteBtn.click();

    // ConfirmDialog uses "Delete" as confirm button text
    const confirmBtn = this.page.locator('button').filter({ hasText: 'Delete' }).last();
    await confirmBtn.click();
  }

  async filterByRole(role: 'All' | 'ADMIN' | 'AUTHOR' | 'EDITOR') {
    if (role === 'All') {
      await this.roleFilter.selectOption('');
    } else {
      await this.roleFilter.selectOption(role);
    }
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async expectUserInList(email: string) {
    await expect(this.page.locator('td').filter({ hasText: email }).first()).toBeVisible({ timeout: 5000 });
  }

  async expectUserNotInList(email: string) {
    await expect(this.page.locator('td').filter({ hasText: email })).not.toBeVisible();
  }
}
