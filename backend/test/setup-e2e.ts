import 'reflect-metadata';

// Mock uuid to avoid ESM issues in tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));
