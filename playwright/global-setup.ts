import { apiClient } from './utils/api-client';

/**
 * Global setup for Playwright tests
 * - Seeds test data
 * - Cleans up from previous runs
 */
async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  try {
    // Login as admin
    await apiClient.loginAsAdmin();

    // Clean up any test data from previous runs
    console.log('🧹 Cleaning up previous test data...');
    await apiClient.cleanupTestData('Test');

    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    // Don't fail tests if setup fails - tests might create their own data
  }
}

export default globalSetup;
