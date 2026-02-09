import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly statCards: Locator;
  readonly topContentTable: Locator;
  readonly pendingCommentsSection: Locator;
  readonly quickActions: Locator;
  readonly sidebar: Locator;
  readonly header: Locator;

  constructor(readonly page: Page) {
    // Dashboard stat cards are plain divs with labels like "Published Content", "Draft Content", etc.
    this.statCards = page.locator('div').filter({ hasText: /Published Content|Draft Content|Total Views|Unique Visitors|Pending Comments|Total Content/i });
    this.topContentTable = page.locator('table').first();
    // The "Pending Comments" section heading is an h2 or h3 in a card, distinct from the stat card label
    this.pendingCommentsSection = page.locator('h2, h3').filter({ hasText: 'Pending Comments' }).first();
    this.quickActions = page.locator('text=Quick Actions');
    this.sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    this.header = page.locator('header, [data-testid="header"]').first();
  }

  async goto() {
    await this.page.goto('/admin');
    await this.expectLoaded();
  }

  async expectLoaded() {
    // Wait for the Dashboard heading or a stat card to be visible
    await expect(this.page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  }

  async getStatCardValue(label: string): Promise<string | null> {
    // Each stat card has a <p> with the label text and a sibling <p> with text-4xl font-bold for the value
    const card = this.page.locator('div').filter({ hasText: new RegExp(label, 'i') });
    const value = card.locator('.text-4xl').first();
    return value.textContent({ timeout: 5000 }).catch(() => null);
  }

  async navigateToContent() {
    const link = this.page.locator('a').filter({ hasText: 'Content' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/content');
  }

  async navigateToMedia() {
    const link = this.page.locator('a').filter({ hasText: 'Media' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/media');
  }

  async navigateToCategories() {
    const link = this.page.locator('a').filter({ hasText: 'Categories' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/categories');
  }

  async navigateToTags() {
    const link = this.page.locator('a').filter({ hasText: 'Tags' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/tags');
  }

  async navigateToComments() {
    const link = this.page.locator('a').filter({ hasText: 'Comments' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/comments');
  }

  async navigateToUsers() {
    const link = this.page.locator('a').filter({ hasText: 'Users' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/users');
  }

  async navigateToSeo() {
    const link = this.page.locator('a').filter({ hasText: 'SEO' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/seo');
  }

  async navigateToAnalytics() {
    const link = this.page.locator('a').filter({ hasText: 'Analytics' }).first();
    await link.click();
    await this.page.waitForURL('**/admin/analytics');
  }

  async clickNewPostQuickAction() {
    const btn = this.page.locator('button').filter({ hasText: 'New Post' }).first();
    await btn.click();
    await this.page.waitForURL('**/admin/content/new');
  }

  async clickUploadMediaQuickAction() {
    const btn = this.page.locator('button').filter({ hasText: 'Upload Media' }).first();
    await btn.click();
    await this.page.waitForURL('**/admin/media');
  }

  async expectSidebarNavigationVisible() {
    const navItems = ['Dashboard', 'Content', 'Media', 'Categories', 'Tags', 'Comments', 'Users', 'SEO', 'Analytics'];
    for (const item of navItems) {
      await expect(this.page.locator('a, button').filter({ hasText: item }).first()).toBeVisible();
    }
  }
}
