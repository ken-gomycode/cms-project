import { test, expect } from '../fixtures/auth.fixture';
import { AnalyticsPage } from '../pages/analytics.page';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays analytics page with stats', async ({ page }) => {
    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();

    // Key metrics should be visible — actual labels: Total Views, Unique Visitors, Total Content, Published Content
    await analyticsPage.expectStatValue('Total Views');
    await analyticsPage.expectStatValue('Unique Visitors');
    await analyticsPage.expectStatValue('Total Content');
    await analyticsPage.expectStatValue('Published Content');
  });

  test('displays top content section', async ({ page }) => {
    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();

    await analyticsPage.expectChartsVisible();
  });

  test('can change date range', async ({ page }) => {
    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();

    await analyticsPage.selectDateRange('7d');
    await analyticsPage.selectDateRange('30d');
    await analyticsPage.selectDateRange('90d');

    // Top content section should still be visible
    await analyticsPage.expectChartsVisible();
  });

  test('displays top content table', async ({ page }) => {
    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();

    await analyticsPage.expectTopContentVisible();
  });
});

test.describe('Analytics Access Control', () => {
  test('author can view analytics', async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('author');

    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.goto();

    await analyticsPage.expectChartsVisible();
  });
});
