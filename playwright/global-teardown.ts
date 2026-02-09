import { apiClient } from './utils/api-client';

/**
 * Global teardown for Playwright tests
 * - Cleans up test data
 */
async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    await apiClient.loginAsAdmin();
    await apiClient.cleanupTestData('Test');
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

export default globalTeardown;
