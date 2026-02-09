import { test as base, expect } from '@playwright/test';
import { apiClient } from '../utils/api-client';
import { credentials } from '../utils/test-data';

export type UserRole = 'admin' | 'author';

interface AuthFixtures {
  authenticatedPage: {
    login: (role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
  };
  adminPage: void;
  authorPage: void;
}

export const test = base.extend<AuthFixtures>(
  {
    authenticatedPage: async ({ page }, use) => {
      await use({
        login: async (role: UserRole) => {
          const creds = role === 'admin' ? credentials.admin : credentials.author;

          await page.goto('/login');
          await page.fill('input[name="email"]', creds.email);
          await page.fill('input[name="password"]', creds.password);
          await page.click('button[type="submit"]');

          // Wait for successful redirect to admin and sidebar to render
          await page.waitForURL('/admin', { timeout: 10000 });
          await page.locator('aside').first().waitFor({ state: 'visible', timeout: 5000 });
        },
        logout: async () => {
          // Click logout in the UI
          const userMenu = page.locator('[data-testid="user-menu"]').or(page.locator('header button')).first();
          await userMenu.click().catch(() => {});

          const logoutBtn = page.locator('text=Logout').or(page.locator('text=Sign Out')).first();
          await logoutBtn.click().catch(() => {
            // If no logout button, clear localStorage
            return page.evaluate(() => {
              localStorage.clear();
            });
          });

          await page.waitForTimeout(500);
        },
      });
    },

    adminPage: async ({ page, authenticatedPage }, use) => {
      await authenticatedPage.login('admin');
      await use();
      await authenticatedPage.logout();
    },

    authorPage: async ({ page, authenticatedPage }, use) => {
      await authenticatedPage.login('author');
      await use();
      await authenticatedPage.logout();
    },
  },
  { scope: 'test' }
);

export { expect } from '@playwright/test';
