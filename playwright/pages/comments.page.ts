import { Page, Locator, expect } from '@playwright/test';

export class CommentsPage {
  readonly statusTabs: Locator;
  readonly dataTable: Locator;
  readonly searchInput: Locator;
  readonly selectAllCheckbox: Locator;

  constructor(readonly page: Page) {
    // CommentModeration.tsx uses buttons for status tabs
    this.statusTabs = page.locator('button').filter({ hasText: /All|Pending|Approved|Rejected|Spam/ });
    this.dataTable = page.locator('table').first();
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
    this.selectAllCheckbox = page.locator('input[type="checkbox"]').first();
  }

  async goto() {
    await this.page.goto('/admin/comments');
    await expect(this.page.locator('h1').filter({ hasText: 'Comment' })).toBeVisible({ timeout: 15000 });
  }

  async filterByStatus(status: 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Spam') {
    const tab = this.statusTabs.filter({ hasText: status }).first();
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async approveComment(authorName: string) {
    const row = this.page.locator('tr').filter({ hasText: authorName });
    const approveBtn = row.locator('button[aria-label="Approve comment"]').first();
    await approveBtn.click();
  }

  async rejectComment(authorName: string) {
    const row = this.page.locator('tr').filter({ hasText: authorName });
    const rejectBtn = row.locator('button[aria-label="Reject comment"]').first();
    await rejectBtn.click();
  }

  async markAsSpam(authorName: string) {
    const row = this.page.locator('tr').filter({ hasText: authorName });
    const spamBtn = row.locator('button[aria-label="Mark as spam"]').first();
    await spamBtn.click();
  }

  async clickViewComment(authorName: string) {
    const row = this.page.locator('tr').filter({ hasText: authorName });
    // CommentModeration.tsx uses an Eye icon with "View full" text
    const viewBtn = row.locator('button, a').filter({ hasText: 'View full' }).first();
    await viewBtn.click();
    await expect(this.page.getByRole('heading', { name: 'Comment Details' })).toBeVisible();
  }

  async selectAllComments() {
    await this.selectAllCheckbox.check();
  }

  async bulkApprove() {
    const approveBtn = this.page.locator('button').filter({ hasText: 'Approve Selected' }).first();
    await approveBtn.click();
  }

  async bulkReject() {
    const rejectBtn = this.page.locator('button').filter({ hasText: 'Reject Selected' }).first();
    await rejectBtn.click();
  }

  async bulkMarkSpam() {
    const spamBtn = this.page.locator('button').filter({ hasText: 'Mark as Spam' }).first();
    await spamBtn.click();
  }

  async expectCommentVisible(authorName: string) {
    await expect(this.page.locator('td').filter({ hasText: authorName }).first()).toBeVisible({ timeout: 5000 });
  }

  async expectStatusBadge(authorName: string, status: 'Approved' | 'Pending' | 'Spam') {
    const row = this.page.locator('tr').filter({ hasText: authorName });
    await expect(row.locator('span').filter({ hasText: status }).first()).toBeVisible();
  }
}
