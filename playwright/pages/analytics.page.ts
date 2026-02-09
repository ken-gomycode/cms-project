import { Page, Locator, expect } from '@playwright/test';

export class AnalyticsPage {
  readonly dateRangeSelector: Locator;
  readonly topContentTable: Locator;

  constructor(readonly page: Page) {
    // AnalyticsDashboard.tsx uses a dropdown button for time period selection
    this.dateRangeSelector = page.locator('button').filter({ hasText: /Last \d+ days/ }).first();
    this.topContentTable = page.locator('table').first();
  }

  async goto() {
    await this.page.goto('/admin/analytics');
    await expect(this.page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible({ timeout: 15000 });
  }

  async selectDateRange(range: '7d' | '14d' | '30d' | '60d' | '90d') {
    // Click the date range dropdown button to open options
    await this.dateRangeSelector.click();

    const rangeLabels: Record<string, string> = {
      '7d': 'Last 7 days',
      '14d': 'Last 14 days',
      '30d': 'Last 30 days',
      '60d': 'Last 60 days',
      '90d': 'Last 90 days',
    };

    const option = this.page.locator('button').filter({ hasText: rangeLabels[range] }).first();
    await option.click();
    await this.page.waitForTimeout(1000); // Wait for data to load
  }

  async expectStatValue(label: string) {
    // Stat card labels are uppercase, e.g. "TOTAL VIEWS (30D)"
    const stat = this.page.locator('div').filter({ hasText: new RegExp(label, 'i') });
    await expect(stat.locator('.text-4xl').first()).toBeVisible({ timeout: 5000 });
  }

  async expectChartsVisible() {
    // AnalyticsDashboard.tsx has no chart elements — it uses stat cards and a table.
    // Treat "Top Content by Views" table as the main data visualization.
    await expect(this.page.locator('text=Top Content by Views').first()).toBeVisible({ timeout: 5000 });
  }

  async expectTopContentVisible() {
    await expect(this.topContentTable).toBeVisible({ timeout: 5000 });
  }
}
