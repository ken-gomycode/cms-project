import { Page, Locator, expect } from '@playwright/test';

export class PublicHomePage {
  readonly header: Locator;
  readonly contentGrid: Locator;
  readonly categoryButtons: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    this.header = page.locator('header').first();
    // Home.tsx uses a div.grid with Link children for content cards
    this.contentGrid = page.locator('main .grid').first();
    // Category filter uses <button> elements in sidebar
    this.categoryButtons = page.locator('aside button');
    this.footer = page.locator('footer').first();
  }

  async goto() {
    await this.page.goto('/');
    // Wait for either content grid or the hero section to be visible
    await expect(this.page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  }

  async filterByCategory(categoryName: string) {
    const btn = this.categoryButtons.filter({ hasText: categoryName }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async clickContentCard(title: string) {
    const card = this.page.locator('a').filter({ hasText: title }).first();
    await card.click();
    await this.page.waitForURL(/\/content\//);
  }

  async expectContentVisible(title: string) {
    await expect(this.page.locator('a').filter({ hasText: title }).first()).toBeVisible({ timeout: 5000 });
  }

  async expectHeaderNavigation() {
    await expect(this.header).toBeVisible();
    // PublicLayout.tsx has: Home, Blog, Contact
    const navLinks = ['Home', 'Blog', 'Contact'];
    for (const link of navLinks) {
      await expect(this.page.locator('header a').filter({ hasText: link }).first()).toBeVisible();
    }
  }

  async expectFooter() {
    await expect(this.footer).toBeVisible();
  }
}

export class PublicContentDetailPage {
  readonly title: Locator;
  readonly body: Locator;
  readonly author: Locator;
  readonly publishedDate: Locator;
  readonly tags: Locator;
  readonly commentsSection: Locator;
  readonly commentForm: Locator;
  readonly relatedContent: Locator;

  constructor(readonly page: Page) {
    this.title = page.locator('h1').first();
    this.body = page.locator('article .prose, article p').first();
    // ContentDetail.tsx shows author name in a <p class="font-medium text-gray-900"> (no "By " prefix)
    this.author = page.locator('.font-medium.text-gray-900').first();
    // Date is displayed in a <span> after a Calendar icon, not a <time> element
    this.publishedDate = page.locator('header span').filter({ hasText: /\d{4}|\w+ \d+/ }).first();
    this.tags = page.locator('.rounded-full').filter({ hasText: /.+/ }).first().locator('..');
    this.commentsSection = page.locator('h2').filter({ hasText: 'Comments' }).first();
    this.commentForm = page.locator('form').filter({ has: page.locator('textarea') }).first();
    this.relatedContent = page.locator('[data-testid="related-content"]').or(page.locator('text=Related')).first();
  }

  async goto(slug: string) {
    await this.page.goto(`/content/${slug}`);
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  async expectTitle(title: string) {
    await expect(this.title).toHaveText(title);
  }

  async expectAuthorVisible() {
    await expect(this.author).toBeVisible();
  }

  async expectPublishedDateVisible() {
    await expect(this.publishedDate).toBeVisible();
  }

  async expectTagsVisible() {
    await expect(this.tags).toBeVisible();
  }

  async expectCommentsSectionVisible() {
    await expect(this.commentsSection).toBeVisible();
  }

  async submitComment(data: { name: string; email: string; body: string }) {
    // Input component generates id from label: "Name" → id="name", "Email" → id="email"
    // Textarea label "Comment" → id="comment"
    await this.page.fill('#name', data.name);
    await this.page.fill('#email', data.email);
    await this.page.fill('#comment', data.body);

    const submitBtn = this.page.locator('button').filter({ hasText: 'Submit Comment' }).first();
    await submitBtn.click();

    // Wait for success toast or the comment appearing
    await this.page.waitForTimeout(2000);
  }

  async expectCommentVisible(body: string) {
    await expect(this.page.locator('p').filter({ hasText: body }).first()).toBeVisible({ timeout: 5000 });
  }
}
