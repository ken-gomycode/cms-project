import { Page, Locator, expect } from '@playwright/test';

export class SeoPage {
  readonly contentList: Locator;
  readonly searchInput: Locator;

  constructor(readonly page: Page) {
    // SeoManagement.tsx uses a DataTable (rendered as <table>)
    this.contentList = page.locator('table').first();
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
  }

  async goto() {
    await this.page.goto('/admin/seo');
    await expect(this.page.locator('h1').filter({ hasText: 'SEO' })).toBeVisible({ timeout: 15000 });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clickEditSeo(contentTitle: string) {
    const item = this.page.locator('tr').filter({ hasText: contentTitle });
    const editBtn = item.locator('button[aria-label="Edit SEO metadata"]').first();
    await editBtn.click();
    await expect(this.page.locator('text=SEO Metadata').first()).toBeVisible();
  }

  async fillSeoForm(data: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    canonicalUrl?: string;
    robotsDirectives?: string;
  }) {
    if (data.metaTitle !== undefined) {
      await this.page.fill('#meta-title', data.metaTitle);
    }

    if (data.metaDescription !== undefined) {
      await this.page.fill('#meta-description', data.metaDescription);
    }

    if (data.ogTitle !== undefined) {
      await this.page.fill('#og-title', data.ogTitle);
    }

    if (data.ogDescription !== undefined) {
      await this.page.fill('#og-description', data.ogDescription);
    }

    if (data.canonicalUrl !== undefined) {
      await this.page.fill('#canonical-url', data.canonicalUrl);
    }

    if (data.robotsDirectives !== undefined) {
      await this.page.selectOption('#robots', data.robotsDirectives);
    }
  }

  async saveSeo() {
    const saveBtn = this.page.locator('button').filter({ hasText: 'Save SEO Metadata' }).first();
    await saveBtn.click();
    await this.page.waitForTimeout(500);
  }

  async clickAnalyzeSeo(contentTitle: string) {
    // First open the edit modal for this content
    await this.clickEditSeo(contentTitle);
    // Then click Analyze SEO button inside the modal
    const analyzeBtn = this.page.locator('button').filter({ hasText: 'Analyze SEO' }).first();
    await analyzeBtn.click();
    // Analysis section heading is "SEO ANALYSIS" (uppercase)
    await expect(this.page.locator('text=SEO ANALYSIS').or(this.page.locator('text=SEO Analysis'))).toBeVisible({ timeout: 5000 });
  }

  async expectSeoStatus(contentTitle: string, status: 'Configured' | 'Not Set') {
    const item = this.page.locator('tr').filter({ hasText: contentTitle });
    await expect(item.locator('text=' + status).first()).toBeVisible();
  }
}
