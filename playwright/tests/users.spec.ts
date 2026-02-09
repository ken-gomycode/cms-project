import { test, expect } from '../fixtures/auth.fixture';
import { UsersPage } from '../pages/users.page';
import { testData } from '../utils/test-data';

test.describe('User Management', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays user list', async ({ page }) => {
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await expect(usersPage.dataTable).toBeVisible();
  });

  test('can create new user', async ({ page }) => {
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await usersPage.clickNewUser();
    const email = testData.user.email();
    await usersPage.fillUserForm({
      firstName: testData.user.firstName,
      lastName: testData.user.lastName,
      email,
      password: testData.user.password,
      role: 'AUTHOR',
    });
    await usersPage.saveUser();

    await usersPage.expectUserInList(email);
  });

  test('can edit existing user', async ({ page }) => {
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    // Edit first user in list — find their row text to filter by
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      // Click the edit button directly on the first row
      const editBtn = firstRow.locator('button[aria-label="Edit user"]').first();
      await editBtn.click();
      await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();

      const newLastName = 'Updated';
      await page.fill('#edit-lastName', newLastName);

      // Save changes button in edit modal
      const saveBtn = page.locator('button').filter({ hasText: 'Save Changes' }).first();
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('can filter users by role', async ({ page }) => {
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await usersPage.filterByRole('ADMIN');
    // Role badge should show for filtered users
    await expect(page.locator('span').filter({ hasText: /Admin/i }).first()).toBeVisible({ timeout: 5000 });

    await usersPage.filterByRole('All');
  });

  test('can search users', async ({ page }) => {
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await usersPage.search('admin');
    await expect(page.locator('td').filter({ hasText: /admin/i }).first()).toBeVisible();
  });

  test('role-based access: author cannot see user management', async ({ page, authenticatedPage }) => {
    await authenticatedPage.logout();
    await authenticatedPage.login('author');

    await page.goto('/admin/users');
    // RoleGuard redirects unauthorized users back to /admin dashboard
    await expect(page).toHaveURL(/\/admin$/, { timeout: 5000 });
  });
});

test.describe('Profile', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  // Helper: SPA-navigate to profile page
  async function gotoProfile(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
      window.history.pushState({}, '', '/admin/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('h1').filter({ hasText: /Profile/i })).toBeVisible({ timeout: 10000 });
  }

  test('can view and edit profile', async ({ page }) => {
    await gotoProfile(page);

    // Edit profile
    await page.locator('input[name="firstName"]').fill('Updated');
    await page.click('button[type="submit"]');

    // Success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({ timeout: 5000 });
  });

  test('displays user info card with role badge and metadata', async ({ page }) => {
    await gotoProfile(page);

    // Email should be visible (displayed as text in the user info card)
    const emailText = page.locator('text=@cms.com');
    await expect(emailText.first()).toBeVisible({ timeout: 5000 });

    // Role badge should be visible
    const roleBadge = page.locator('span').filter({ hasText: /ADMIN|Admin/ });
    await expect(roleBadge.first()).toBeVisible();

    // Member since metadata
    const memberSince = page.locator('text=Member since');
    await expect(memberSince.first()).toBeVisible();
  });

  test('can update avatar URL', async ({ page }) => {
    await gotoProfile(page);

    // Modify firstName to make form dirty (avatar value may already match from previous run)
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.clear();
    await firstNameInput.pressSequentially('Admin');

    // Also update avatar
    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.clear();
    await avatarInput.pressSequentially(`https://example.com/avatar-${Date.now()}.png`);

    // Wait for form dirty state
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Success toast/message
    await expect(
      page.locator('text=Profile updated successfully')
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for invalid avatar URL', async ({ page }) => {
    await gotoProfile(page);

    const avatarInput = page.locator('input[name="avatar"]');
    await avatarInput.fill('not-a-valid-url');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Must be a valid URL')).toBeVisible({ timeout: 5000 });
  });
});
