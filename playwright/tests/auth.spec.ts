import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { testData, credentials } from '../utils/test-data';
import { apiClient } from '../utils/api-client';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('admin can login successfully', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login(credentials.admin.email, credentials.admin.password);
      await loginPage.expectSuccessfulLogin();

      const dashboard = new DashboardPage(page);
      await dashboard.expectLoaded();
    });

    test('author can login successfully', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login(credentials.author.email, credentials.author.password);
      await loginPage.expectSuccessfulLogin();

      const dashboard = new DashboardPage(page);
      await dashboard.expectLoaded();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('invalid@email.com', 'wrongpassword');
      await loginPage.expectErrorMessage();
    });

    test('shows error for empty fields', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.submitButton.click();
      await loginPage.expectErrorMessage();
    });
  });

  test.describe('Register', () => {
    test('new user can register successfully', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const user = {
        firstName: testData.user.firstName,
        lastName: testData.user.lastName,
        email: testData.user.email(),
        password: testData.user.password,
      };

      await registerPage.register(user);
      await registerPage.expectSuccessfulRegistration();
    });

    test('shows error for existing email', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const user = {
        firstName: 'Test',
        lastName: 'User',
        email: credentials.admin.email, // existing email
        password: testData.user.password,
      };

      await registerPage.register(user);
      await registerPage.expectErrorMessage();
    });

    test('navigates to login page', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.navigateToLogin();

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects unauthenticated user to login', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL('/login');
    });

    test('redirects unauthenticated user from content page', async ({ page }) => {
      await page.goto('/admin/content');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Token Management', () => {
    test('can refresh token with valid refresh token', async () => {
      const { refreshToken } = await apiClient.loginAndGetTokens(credentials.admin);
      expect(refreshToken).toBeTruthy();

      const res = await apiClient.refreshToken(refreshToken);
      expect(res.ok).toBeTruthy();

      const json = await res.json();
      const data = json.data ?? json;
      expect(data.accessToken).toBeTruthy();

      // Verify new access token works
      const verifyRes = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/auth/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      expect(verifyRes.ok).toBeTruthy();
    });

    test('refresh with invalid token returns 401', async () => {
      const res = await apiClient.refreshToken('invalid-refresh-token-value');
      expect(res.status).toBe(401);
    });

    test('can logout by revoking refresh token', async () => {
      const { refreshToken } = await apiClient.loginAndGetTokens(credentials.admin);

      const logoutRes = await apiClient.logout(refreshToken);
      expect(logoutRes.ok).toBeTruthy();

      // Verify the revoked refresh token no longer works
      const refreshRes = await apiClient.refreshToken(refreshToken);
      expect(refreshRes.ok).toBeFalsy();
    });
  });
});
