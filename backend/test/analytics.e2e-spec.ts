import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus, UserRole } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let editorToken: string;
  let authorToken: string;
  let contentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up existing data (order matters due to foreign keys)
    await prisma.analytics.deleteMany();
    await prisma.seoMetadata.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.contentCategory.deleteMany();
    await prisma.contentTag.deleteMany();
    await prisma.content.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Register admin user
    const adminRegisterResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
    });
    adminToken = adminRegisterResponse.body.accessToken;
    const adminUserId = adminRegisterResponse.body.user.id;

    // Update admin to ADMIN role
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: UserRole.ADMIN },
    });

    // Register editor user
    const editorRegisterResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'editor@test.com',
      password: 'Password123!',
      firstName: 'Editor',
      lastName: 'User',
    });
    editorToken = editorRegisterResponse.body.accessToken;
    const editorUserId = editorRegisterResponse.body.user.id;

    // Update editor to EDITOR role
    await prisma.user.update({
      where: { id: editorUserId },
      data: { role: UserRole.EDITOR },
    });

    // Register author user
    const authorRegisterResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'author@test.com',
      password: 'Password123!',
      firstName: 'Author',
      lastName: 'User',
    });
    authorToken = authorRegisterResponse.body.accessToken;
    const authorUserId = authorRegisterResponse.body.user.id;

    // Update author to AUTHOR role
    await prisma.user.update({
      where: { id: authorUserId },
      data: { role: UserRole.AUTHOR },
    });

    // Create test content
    const content = await prisma.content.create({
      data: {
        title: 'Test Analytics Content',
        slug: 'test-analytics-content',
        body: 'This is test content for analytics',
        excerpt: 'Test excerpt',
        status: ContentStatus.PUBLISHED,
        authorId: adminUserId,
        publishedAt: new Date(),
      },
    });
    contentId = content.id;

    // Create some analytics data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.analytics.createMany({
      data: [
        {
          contentId: content.id,
          views: 100,
          uniqueVisitors: 50,
          date: today,
        },
        {
          contentId: content.id,
          views: 80,
          uniqueVisitors: 40,
          date: yesterday,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.analytics.deleteMany();
    await prisma.seoMetadata.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.contentVersion.deleteMany();
    await prisma.contentCategory.deleteMany();
    await prisma.contentTag.deleteMany();
    await prisma.content.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/analytics/content/:contentId (GET)', () => {
    it('should return content statistics for admin', () => {
      return request(app.getHttpServer())
        .get(`/analytics/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('contentId', contentId);
          expect(res.body).toHaveProperty('period');
          expect(res.body.period).toHaveProperty('days', 30);
          expect(res.body).toHaveProperty('totals');
          expect(res.body.totals.views).toBeGreaterThan(0);
          expect(res.body.totals.uniqueVisitors).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('dailyStats');
          expect(Array.isArray(res.body.dailyStats)).toBe(true);
        });
    });

    it('should return content statistics for editor', () => {
      return request(app.getHttpServer())
        .get(`/analytics/content/${contentId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('contentId', contentId);
          expect(res.body.totals.views).toBe(180);
          expect(res.body.totals.uniqueVisitors).toBe(90);
        });
    });

    it('should support custom days parameter', () => {
      return request(app.getHttpServer())
        .get(`/analytics/content/${contentId}?days=7`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.period.days).toBe(7);
        });
    });

    it('should deny access for author role', () => {
      return request(app.getHttpServer())
        .get(`/analytics/content/${contentId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(403);
    });

    it('should deny access without authentication', () => {
      return request(app.getHttpServer()).get(`/analytics/content/${contentId}`).expect(401);
    });
  });

  describe('/analytics/top-content (GET)', () => {
    it('should return top content for admin', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-content')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('content');
          expect(res.body[0]).toHaveProperty('views');
          expect(res.body[0]).toHaveProperty('uniqueVisitors');
          expect(res.body[0].content).toHaveProperty('id');
          expect(res.body[0].content).toHaveProperty('title');
          expect(res.body[0].content).toHaveProperty('slug');
        });
    });

    it('should return top content for editor', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-content')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support limit parameter', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-content?limit=5')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it('should support days parameter', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-content?days=7')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should deny access for author role', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-content')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(403);
    });

    it('should deny access without authentication', () => {
      return request(app.getHttpServer()).get('/analytics/top-content').expect(401);
    });
  });

  describe('/analytics/dashboard (GET)', () => {
    it('should return dashboard summary for admin', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('contentByStatus');
          expect(res.body.contentByStatus).toHaveProperty(ContentStatus.PUBLISHED);
          expect(res.body.contentByStatus).toHaveProperty(ContentStatus.DRAFT);
          expect(res.body).toHaveProperty('contentByRole');
          expect(res.body.contentByRole).toHaveProperty(UserRole.ADMIN);
          expect(res.body.contentByRole).toHaveProperty(UserRole.EDITOR);
          expect(res.body).toHaveProperty('views');
          expect(res.body.views).toHaveProperty('last30Days');
          expect(res.body.views).toHaveProperty('allTime');
          expect(res.body.views.last30Days).toHaveProperty('total');
          expect(res.body.views.last30Days).toHaveProperty('unique');
          expect(res.body).toHaveProperty('totalContent');
        });
    });

    it('should return dashboard summary for editor', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.totalContent).toBeGreaterThan(0);
          expect(res.body.views.allTime.total).toBeGreaterThan(0);
        });
    });

    it('should deny access for author role', () => {
      return request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${authorToken}`)
        .expect(403);
    });

    it('should deny access without authentication', () => {
      return request(app.getHttpServer()).get('/analytics/dashboard').expect(401);
    });
  });

  describe('Analytics Interceptor Integration', () => {
    it('should track view when accessing content by slug', async () => {
      const initialStats = await request(app.getHttpServer())
        .get(`/analytics/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const initialViews = initialStats.body.totals.views;

      // Access the content to trigger analytics
      await request(app.getHttpServer()).get('/content/test-analytics-content').expect(200);

      // Give some time for async analytics to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if views increased
      const updatedStats = await request(app.getHttpServer())
        .get(`/analytics/content/${contentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedStats.body.totals.views).toBeGreaterThanOrEqual(initialViews);
    });
  });
});
