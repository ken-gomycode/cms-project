import { randomUUID } from 'crypto';

export const generateUniqueId = () => randomUUID().slice(0, 8);

export const testData = {
  content: {
    title: (prefix = 'Test') => `${prefix} Content ${generateUniqueId()}`,
    body: `This is a test content body generated for Playwright testing. It contains enough characters to pass validation requirements and demonstrates the CMS content management functionality.`,
    excerpt: 'A brief excerpt for test content.',
  },
  category: {
    name: (prefix = 'Test') => `${prefix} Category ${generateUniqueId()}`,
    description: 'Test category description for Playwright tests.',
  },
  tag: {
    name: (prefix = 'Test') => `${prefix}Tag${generateUniqueId()}`,
  },
  user: {
    email: (prefix = 'test') => `${prefix}.${generateUniqueId()}@test.com`,
    password: 'Test@123456',
    firstName: 'Test',
    lastName: 'User',
  },
  comment: {
    body: (prefix = 'Test') => `${prefix} comment ${generateUniqueId()}`,
    authorName: 'Playwright Tester',
    authorEmail: 'playwright@test.com',
  },
  media: {
    imageUrl: 'https://picsum.photos/400/300',
    altText: 'Test image for media library',
  },
};

export const credentials = {
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@cms.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
  author: {
    email: process.env.AUTHOR_EMAIL || 'author@cms.com',
    password: process.env.AUTHOR_PASSWORD || 'Author@123',
  },
};
