import { test, expect } from '../fixtures/auth.fixture';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays all stat cards', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    const statLabels = ['Published Content', 'Draft Content', 'Total Views', 'Unique Visitors', 'Pending Comments', 'Total Content'];
    for (const label of statLabels) {
      const value = await dashboard.getStatCardValue(label);
      expect(value).toBeTruthy();
    }
  });

  test('displays top content table', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.topContentTable).toBeVisible();
  });

  test('displays pending comments section', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.pendingCommentsSection).toBeVisible();
  });

  test('quick action: new post redirects to content editor', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.clickNewPostQuickAction();

    await expect(page).toHaveURL('/admin/content/new');
  });

  test('quick action: upload media redirects to media library', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.clickUploadMediaQuickAction();

    await expect(page).toHaveURL('/admin/media');
  });

  test('sidebar navigation is visible', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectSidebarNavigationVisible();
  });

  test('navigates to all admin sections', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.navigateToContent();
    await expect(page).toHaveURL('/admin/content');

    await dashboard.navigateToMedia();
    await expect(page).toHaveURL('/admin/media');

    await dashboard.navigateToCategories();
    await expect(page).toHaveURL('/admin/categories');

    await dashboard.navigateToTags();
    await expect(page).toHaveURL('/admin/tags');

    await dashboard.navigateToComments();
    await expect(page).toHaveURL('/admin/comments');

    await dashboard.navigateToUsers();
    await expect(page).toHaveURL('/admin/users');

    await dashboard.navigateToSeo();
    await expect(page).toHaveURL('/admin/seo');

    await dashboard.navigateToAnalytics();
    await expect(page).toHaveURL('/admin/analytics');
  });
});

test.describe('Author Dashboard', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('author');
  });

  test('author can access dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectLoaded();
  });

  test('author cannot access user management', async ({ page }) => {
    await page.goto('/admin/users');
    // RoleGuard redirects unauthorized users back to /admin dashboard
    await expect(page).toHaveURL(/\/admin$/, { timeout: 5000 });
  });
});
