import { test, expect } from '../fixtures/auth.fixture';
import { CategoriesPage, TagsPage } from '../pages/taxonomy.page';
import { testData } from '../utils/test-data';
import { apiClient } from '../utils/api-client';

test.describe('Taxonomy Management', () => {
  test.describe('Categories', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('can create new category', async ({ page }) => {
      const categoriesPage = new CategoriesPage(page);
      await categoriesPage.goto();

      await categoriesPage.clickNewCategory();
      await categoriesPage.fillCategoryForm({
        name: testData.category.name(),
        description: testData.category.description,
      });
      await categoriesPage.saveCategory();

      await categoriesPage.expectCategoryInList(testData.category.name());
    });

    test('can create nested category', async ({ page }) => {
      // Create parent category first
      await apiClient.loginAsAdmin();
      const parent = await apiClient.createCategory({
        name: testData.category.name('Parent'),
        description: 'Parent category',
      });

      const categoriesPage = new CategoriesPage(page);
      await categoriesPage.goto();

      await categoriesPage.clickNewCategory();
      const childName = testData.category.name('Child');
      await categoriesPage.fillCategoryForm({
        name: childName,
        description: 'Child category',
        parentId: parent.id,
      });
      await categoriesPage.saveCategory();

      await categoriesPage.expectCategoryInList(childName);
    });

    test('can delete category', async ({ page }) => {
      // Create category via API
      await apiClient.loginAsAdmin();
      const category = await apiClient.createCategory({
        name: testData.category.name('To Delete'),
      });

      const categoriesPage = new CategoriesPage(page);
      await categoriesPage.goto();
      await categoriesPage.deleteCategory(category.name);

      // Verify deleted
      await expect(page.locator('td').filter({ hasText: category.name })).not.toBeVisible();
    });
  });

  test.describe('Tags', () => {
    test.beforeEach(async ({ page, authenticatedPage }) => {
      await authenticatedPage.login('admin');
    });

    test('can create new tag', async ({ page }) => {
      const tagsPage = new TagsPage(page);
      await tagsPage.goto();

      await tagsPage.clickNewTag();
      const tagName = testData.tag.name();
      await tagsPage.fillTagForm({ name: tagName });
      await tagsPage.saveTag();

      await tagsPage.expectTagInList(tagName);
    });

    test('auto-generates slug from tag name', async ({ page }) => {
      const tagsPage = new TagsPage(page);
      await tagsPage.goto();

      await tagsPage.clickNewTag();
      await page.fill('input[name="name"]', 'My Test Tag');
      await page.waitForTimeout(500);

      const slug = await page.inputValue('input[name="slug"]');
      expect(slug).toBe('my-test-tag');
    });

    test('can delete tag', async ({ page }) => {
      // Create tag via API
      await apiClient.loginAsAdmin();
      const tag = await apiClient.createTag({
        name: testData.tag.name('To Delete'),
      });

      const tagsPage = new TagsPage(page);
      await tagsPage.goto();
      await tagsPage.deleteTag(tag.name);

      await expect(page.locator('td').filter({ hasText: tag.name })).not.toBeVisible();
    });
  });
});
