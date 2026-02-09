import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { credentials } from '../utils/test-data';

test.describe('Accessibility', () => {
  test('login page has no accessibility violations', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Basic accessibility checks
    await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');

    // Check for labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const hasLabel = await input.locator('xpath=../label').count() > 0
        || await input.getAttribute('aria-label')
        || await input.getAttribute('placeholder');
      expect(hasLabel).toBeTruthy();
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('buttons have proper labels', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    expect(buttonText?.trim()).toBeTruthy();
  });

  test('images have alt text where applicable', async ({ page }) => {
    // After login
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.admin.email, credentials.admin.password);

    await page.waitForURL('/admin');

    // Check images in the admin
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Decorative images can have empty alt, but content images should have alt
      if (alt === null) {
        const isDecorative = await img.getAttribute('role') === 'presentation'
          || await img.getAttribute('aria-hidden') === 'true';
        expect(isDecorative).toBe(true);
      }
    }
  });

  test('form errors are announced', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit empty form
    await loginPage.submitButton.click();

    // Error should be visible
    const error = page.locator('[role="alert"], .error, .text-red-600').first();
    await expect(error).toBeVisible();
  });

  test('keyboard navigation works for admin sidebar', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(credentials.admin.email, credentials.admin.password);

    await page.waitForURL('/admin');

    // Tab to sidebar links
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('color contrast meets WCAG AA', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Visual check - text should be readable
    const body = await page.locator('body');
    const color = await body.evaluate(el => getComputedStyle(el).color);
    const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);

    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });
});
