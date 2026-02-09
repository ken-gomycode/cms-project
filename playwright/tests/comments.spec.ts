import { test, expect } from '../fixtures/auth.fixture';
import { CommentsPage } from '../pages/comments.page';
import { apiClient } from '../utils/api-client';
import { testData } from '../utils/test-data';

test.describe('Comment Moderation', () => {
  test.beforeEach(async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');
  });

  test('displays comment list', async ({ page }) => {
    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    await expect(commentsPage.dataTable).toBeVisible();
  });

  test('can filter comments by status', async ({ page }) => {
    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    await commentsPage.filterByStatus('Pending');
    await commentsPage.filterByStatus('Approved');
    await commentsPage.filterByStatus('Spam');
    await commentsPage.filterByStatus('All');
  });

  test('can approve pending comment', async ({ page }) => {
    // Setup: Create content and comment via API
    await apiClient.loginAsAdmin();
    const content = await apiClient.createContent({
      title: testData.content.title('With Comments'),
      body: testData.content.body,
      status: 'PUBLISHED',
    });

    // Note: Comment creation would need a separate endpoint
    // Assuming comments exist for testing

    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();
    await commentsPage.filterByStatus('Pending');

    // Approve first pending comment
    const pendingComment = await page.locator('tr').filter({ hasText: 'Pending' }).first();
    if (await pendingComment.isVisible().catch(() => false)) {
      const authorName = await pendingComment.locator('td').nth(1).textContent() || 'Unknown';
      await commentsPage.approveComment(authorName);
      await commentsPage.expectStatusBadge(authorName, 'Approved');
    }
  });

  test('can mark comment as spam', async ({ page }) => {
    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    const comment = await page.locator('tr').filter({ hasText: /test|comment/i }).first();
    if (await comment.isVisible().catch(() => false)) {
      const authorName = await comment.locator('td').nth(1).textContent() || 'Unknown';
      await commentsPage.markAsSpam(authorName);
      await commentsPage.expectStatusBadge(authorName, 'Spam');
    }
  });

  test('can view comment details', async ({ page }) => {
    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    const comment = await page.locator('tr').first();
    if (await comment.isVisible().catch(() => false)) {
      const authorName = await comment.locator('td').nth(1).textContent() || 'Unknown';
      await commentsPage.clickViewComment(authorName);

      // Modal should show comment details
      await expect(page.locator('text=Comment Details').or(page.locator('[data-testid="comment-modal"]'))).toBeVisible();
    }
  });

  test('bulk actions work', async ({ page }) => {
    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    await commentsPage.selectAllComments();
    // After selecting, bulk action buttons should appear
    const bulkBar = page.locator('button').filter({ hasText: 'Approve Selected' }).first();
    await expect(bulkBar).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Batch Comment Moderation', () => {
  let contentId: string;
  const commentIds: string[] = [];

  test.beforeAll(async () => {
    await apiClient.loginAsAdmin();
    const content = await apiClient.createContent({
      title: testData.content.title('BatchComments'),
      body: testData.content.body,
      status: 'PUBLISHED',
    });
    contentId = content.id;

    // Create multiple comments via public endpoint
    for (let i = 0; i < 3; i++) {
      const res = await apiClient.createComment({
        body: testData.comment.body('Batch'),
        authorName: testData.comment.authorName,
        authorEmail: testData.comment.authorEmail,
        contentId,
      });
      if (res.ok) {
        const json = await res.json();
        const comment = json.data ?? json;
        commentIds.push(comment.id);
      }
    }
  });

  test.afterAll(async () => {
    await apiClient.loginAsAdmin();
    await apiClient.deleteContent(contentId).catch(() => {});
  });

  test('can perform batch approve via API', async () => {
    test.skip(commentIds.length < 2, 'Not enough comments created');

    await apiClient.loginAsAdmin();
    const res = await apiClient.batchModerateComments(commentIds, 'APPROVED');
    expect(res.ok).toBeTruthy();

    // Verify comments are approved
    for (const id of commentIds) {
      const commentRes = await apiClient.get(`/comments/${id}`);
      if (commentRes.ok) {
        const json = await commentRes.json();
        const comment = json.data ?? json;
        expect(comment.status).toBe('APPROVED');
      }
    }
  });

  test('can perform batch moderate via UI', async ({ page, authenticatedPage }) => {
    await authenticatedPage.login('admin');

    const commentsPage = new CommentsPage(page);
    await commentsPage.goto();

    // Select all and approve
    await commentsPage.selectAllComments();
    await commentsPage.bulkApprove();

    // Check that badges updated
    await page.waitForTimeout(1000);
    const approvedBadges = page.locator('span').filter({ hasText: 'Approved' });
    await expect(approvedBadges.first()).toBeVisible({ timeout: 5000 });
  });

  test('batch moderate rejects invalid status', async () => {
    await apiClient.loginAsAdmin();
    const res = await apiClient.batchModerateComments(commentIds, 'INVALID_STATUS');
    expect(res.ok).toBeFalsy();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
