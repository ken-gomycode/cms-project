import { test, expect } from '../fixtures/auth.fixture';
import { SeoPage } from '../pages/seo.page';
import { apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';

test.describe('SEO Management', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays SEO management page', async ({ page }) => {
    const seoPage = new SeoPage(page);
    await seoPage.goto();

    await expect(seoPage.contentList).toBeVisible();
  });

  test('can edit SEO metadata for content', async ({ page }) => {
    // Create content first
    await apiClient.loginAsAdmin();
    const content = await apiClient.createContent({
      title: testData.content.title('SEO Test'),
      body: testData.content.body,
      status: 'PUBLISHED',
    });

    const seoPage = new SeoPage(page);
    await seoPage.goto();
    await seoPage.search(content.title);

    await seoPage.clickEditSeo(content.title);
    await seoPage.fillSeoForm({
      metaTitle: 'Custom SEO Title',
      metaDescription: 'Custom meta description for SEO testing',
      ogTitle: 'OG Title',
      ogDescription: 'OG Description',
      canonicalUrl: 'https://example.com/custom-url',
      robotsDirectives: 'index, follow',
    });
    await seoPage.saveSeo();

    // After saving, modal should close and table should be visible
    await page.waitForTimeout(1000);
    await expect(seoPage.contentList).toBeVisible({ timeout: 5000 });
  });

  test('shows character count for meta fields', async ({ page }) => {
    await apiClient.loginAsAdmin();
    const content = await apiClient.createContent({
      title: testData.content.title('SEO Char Count'),
      body: testData.content.body,
      status: 'PUBLISHED',
    });

    const seoPage = new SeoPage(page);
    await seoPage.goto();
    await seoPage.clickEditSeo(content.title);

    // Meta title should show character count (recommended: 60)
    await page.fill('#meta-title', 'A'.repeat(70));
    await expect(page.locator('text=/ 60').or(page.locator('text=/60'))).toBeVisible();

    // Meta description should show character count (recommended: 160)
    await page.fill('#meta-description', 'B'.repeat(170));
    await expect(page.locator('text=/ 160').or(page.locator('text=/160'))).toBeVisible();
  });

  test('can analyze SEO quality', async ({ page }) => {
    await apiClient.loginAsAdmin();
    const content = await apiClient.createContent({
      title: testData.content.title('SEO Analysis'),
      body: testData.content.body,
      status: 'PUBLISHED',
    });

    const seoPage = new SeoPage(page);
    await seoPage.goto();
    await seoPage.clickAnalyzeSeo(content.title);

    // Analysis section should show score (number/100) and recommendations
    await expect(page.locator('text=/100').or(page.locator('text=SEO ANALYSIS')).or(page.locator('text=SEO Analysis'))).toBeVisible({ timeout: 5000 });
  });

  test('shows SEO status for content', async ({ page }) => {
    const seoPage = new SeoPage(page);
    await seoPage.goto();

    // Should see "Configured" or "Not Set" status badges
    const statusBadges = page.locator('span').filter({ hasText: /Configured|Not Set/ });
    await expect(statusBadges.first()).toBeVisible({ timeout: 5000 });
  });
});
