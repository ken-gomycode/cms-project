import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { credentials } from '../utils/test-data';

/**
 * Smoke tests - quick checks that core functionality works
 * These should run fast and catch major issues
 */
test.describe('Smoke Tests', () => {
  test('backend API is reachable', async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    // Root endpoint requires auth (no @Public()), so check /api/docs which serves Swagger
    const response = await fetch(`${apiUrl}/api/docs`);
    expect(response.ok).toBe(true);
  });

  test('frontend loads without errors', async ({ page }) => {
    await page.goto('/');

    // Check no console errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Should have no critical errors
    const criticalErrors = logs.filter(log =>
      log.includes('SyntaxError') ||
      log.includes('ReferenceError') ||
      log.includes('TypeError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('login flow works end-to-end', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.admin.email, credentials.admin.password);

    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });

  test('all major admin routes load', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.admin.email, credentials.admin.password);
    await page.waitForURL('**/admin');

    const routes = [
      '/admin/content',
      '/admin/media',
      '/admin/categories',
      '/admin/tags',
      '/admin/comments',
      '/admin/users',
      '/admin/seo',
      '/admin/analytics',
    ];

    for (const route of routes) {
      await page.goto(route);
      // Should not redirect to login (which means auth error)
      expect(page.url()).not.toContain('/login');
      // Should load without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('public pages are accessible', async ({ page }) => {
    const publicRoutes = ['/', '/content/1'];

    for (const route of publicRoutes) {
      const response = await page.goto(route);
      // Should not return 500
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('API documentation is accessible', async ({ page }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    await page.goto(`${apiUrl}/api/docs`);

    // Swagger UI should load
    await expect(page.locator('#swagger-ui')).toBeVisible({ timeout: 10000 });
  });

  test('database connection is working', async () => {
    // This test validates the backend can connect to the database
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Try to get content list (requires DB) - this is a @Public() endpoint
    const response = await fetch(`${apiUrl}/content?page=1&limit=1`);
    expect(response.status).toBe(200);

    const json = await response.json();
    // TransformInterceptor wraps response: { data: { data: [...], meta: {...} }, statusCode, timestamp }
    const inner = json.data ?? json;
    expect(inner).toHaveProperty('data');
    expect(inner).toHaveProperty('meta');
  });

  test('cloud configuration is working', async ({ page }) => {
    // After login, media page should load (uses Cloudinary)
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.admin.email, credentials.admin.password);
    await page.waitForURL('**/admin');

    await page.goto('/admin/media');
    await expect(page.locator('button').filter({ hasText: 'Upload' }).first()).toBeVisible();
  });
});
