import { PrismaClient, UserRole, ContentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data in development
  if (process.env.NODE_ENV !== 'production') {
    await prisma.auditLog.deleteMany();
    await prisma.analytics.deleteMany();
    await prisma.seoMetadata.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.contentTag.deleteMany();
    await prisma.contentCategory.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.media.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    console.log('✨ Cleared existing data');
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cms.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('👤 Created admin user:', admin.email);

  // Create author user
  const authorPassword = await bcrypt.hash('Author@123', 12);
  const author = await prisma.user.create({
    data: {
      email: 'author@cms.com',
      password: authorPassword,
      firstName: 'John',
      lastName: 'Author',
      role: UserRole.AUTHOR,
      isActive: true,
    },
  });
  console.log('👤 Created author user:', author.email);

  // Create categories
  const techCategory = await prisma.category.create({
    data: {
      name: 'Technology',
      slug: 'technology',
      description: 'Articles about technology and innovation',
    },
  });

  const webDevCategory = await prisma.category.create({
    data: {
      name: 'Web Development',
      slug: 'web-development',
      description: 'Web development tutorials and tips',
      parentId: techCategory.id,
    },
  });

  const designCategory = await prisma.category.create({
    data: {
      name: 'Design',
      slug: 'design',
      description: 'UI/UX design and creative content',
    },
  });

  console.log(
    '📁 Created categories:',
    techCategory.name,
    webDevCategory.name,
    designCategory.name,
  );

  // Create tags
  const reactTag = await prisma.tag.create({
    data: { name: 'React', slug: 'react' },
  });

  const nestjsTag = await prisma.tag.create({
    data: { name: 'NestJS', slug: 'nestjs' },
  });

  const typescriptTag = await prisma.tag.create({
    data: { name: 'TypeScript', slug: 'typescript' },
  });

  const tutorialTag = await prisma.tag.create({
    data: { name: 'Tutorial', slug: 'tutorial' },
  });

  console.log(
    '🏷️  Created tags:',
    reactTag.name,
    nestjsTag.name,
    typescriptTag.name,
    tutorialTag.name,
  );

  // Create sample content
  const content = await prisma.content.create({
    data: {
      title: 'Getting Started with NestJS and React',
      slug: 'getting-started-with-nestjs-and-react',
      body: `
# Getting Started with NestJS and React

This comprehensive guide will walk you through building a full-stack application using NestJS for the backend and React for the frontend.

## Prerequisites

- Node.js 20+ installed
- Basic knowledge of TypeScript
- Familiarity with REST APIs

## Setting Up the Backend

NestJS is a progressive Node.js framework for building efficient and scalable server-side applications. It uses TypeScript by default and combines elements of OOP, FP, and FRP.

### Installation

\`\`\`bash
npm i -g @nestjs/cli
nest new my-project
\`\`\`

## Setting Up the Frontend

React is a JavaScript library for building user interfaces. Combined with Vite, it provides a fast development experience.

### Installation

\`\`\`bash
npm create vite@latest my-app -- --template react-ts
\`\`\`

## Conclusion

By following this guide, you now have a solid foundation for building full-stack applications with NestJS and React.
      `,
      excerpt:
        'Learn how to build a modern full-stack application using NestJS and React with TypeScript.',
      status: ContentStatus.PUBLISHED,
      authorId: author.id,
      publishedAt: new Date(),
      categories: {
        create: [{ categoryId: webDevCategory.id }],
      },
      tags: {
        create: [
          { tagId: reactTag.id },
          { tagId: nestjsTag.id },
          { tagId: typescriptTag.id },
          { tagId: tutorialTag.id },
        ],
      },
      seoMetadata: {
        create: {
          metaTitle: 'Getting Started with NestJS and React - Complete Guide',
          metaDescription:
            'Learn how to build a modern full-stack application using NestJS and React with TypeScript. A comprehensive tutorial for developers.',
          ogTitle: 'Getting Started with NestJS and React',
          ogDescription: 'Complete guide to building full-stack applications',
        },
      },
      versions: {
        create: {
          title: 'Getting Started with NestJS and React',
          body: 'Initial version',
          versionNumber: 1,
          changeDescription: 'Initial creation',
          createdById: author.id,
        },
      },
    },
  });

  console.log('📝 Created sample content:', content.title);

  // Create a draft article
  const draftContent = await prisma.content.create({
    data: {
      title: 'Advanced TypeScript Patterns',
      slug: 'advanced-typescript-patterns',
      body: 'This article covers advanced TypeScript patterns including generics, decorators, and utility types.',
      excerpt: 'Deep dive into advanced TypeScript patterns for professional developers.',
      status: ContentStatus.DRAFT,
      authorId: author.id,
      categories: {
        create: [{ categoryId: techCategory.id }],
      },
      tags: {
        create: [{ tagId: typescriptTag.id }],
      },
      versions: {
        create: {
          title: 'Advanced TypeScript Patterns',
          body: 'This article covers advanced TypeScript patterns including generics, decorators, and utility types.',
          versionNumber: 1,
          changeDescription: 'Initial draft',
          createdById: author.id,
        },
      },
    },
  });

  console.log('📝 Created draft content:', draftContent.title);

  console.log('✅ Seeding completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin - Email: admin@cms.com, Password: Admin@123');
  console.log('Author - Email: author@cms.com, Password: Author@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
