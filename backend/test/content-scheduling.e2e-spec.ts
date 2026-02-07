import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Content Scheduling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let contentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    // Configure app like main.ts
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
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // Clean up test data
    await prisma.comment.deleteMany({});
    await prisma.contentVersion.deleteMany({});
    await prisma.seoMetadata.deleteMany({});
    await prisma.analytics.deleteMany({});
    await prisma.contentCategory.deleteMany({});
    await prisma.contentTag.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user and get token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'scheduletest@example.com',
      password: 'Test1234!',
      firstName: 'Schedule',
      lastName: 'Tester',
    });

    userId = registerResponse.body.user.id;
    accessToken = registerResponse.body.accessToken;

    // Create a draft content for testing
    const contentResponse = await request(app.getHttpServer())
      .post('/content')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Test Content for Scheduling',
        body: 'This is test content body',
        excerpt: 'Test excerpt',
        status: 'DRAFT',
      });

    contentId = contentResponse.body.id;
  });

  afterAll(async () => {
    // Clean up database
    await prisma.comment.deleteMany({});
    await prisma.contentVersion.deleteMany({});
    await prisma.seoMetadata.deleteMany({});
    await prisma.analytics.deleteMany({});
    await prisma.contentCategory.deleteMany({});
    await prisma.contentTag.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    await app.close();
  });

  describe('POST /content/:id/schedule', () => {
    it('should schedule content with future date', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      const response = await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scheduledAt: futureDate,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id', contentId);
      expect(response.body).toHaveProperty('status', 'SCHEDULED');
      expect(response.body).toHaveProperty('scheduledAt');
      expect(new Date(response.body.scheduledAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject scheduling with past date', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      // First unschedule the content
      await request(app.getHttpServer())
        .post(`/content/${contentId}/unschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scheduledAt: pastDate,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('future date');
    });

    it('should reject scheduling without authentication', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .send({
          scheduledAt: futureDate,
        })
        .expect(401);
    });

    it('should reject scheduling with invalid date format', async () => {
      await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scheduledAt: 'invalid-date',
        })
        .expect(400);
    });

    it('should reject scheduling without scheduledAt field', async () => {
      await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should reject scheduling non-existent content', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      await request(app.getHttpServer())
        .post('/content/00000000-0000-0000-0000-000000000000/schedule')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scheduledAt: futureDate,
        })
        .expect(404);
    });
  });

  describe('POST /content/:id/unschedule', () => {
    beforeEach(async () => {
      // Schedule content before each unschedule test
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      await request(app.getHttpServer())
        .post(`/content/${contentId}/schedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scheduledAt: futureDate,
        });
    });

    it('should unschedule scheduled content', async () => {
      const response = await request(app.getHttpServer())
        .post(`/content/${contentId}/unschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id', contentId);
      expect(response.body).toHaveProperty('status', 'DRAFT');
      expect(response.body).toHaveProperty('scheduledAt', null);
    });

    it('should reject unscheduling without authentication', async () => {
      await request(app.getHttpServer()).post(`/content/${contentId}/unschedule`).expect(401);
    });

    it('should reject unscheduling non-scheduled content', async () => {
      // First unschedule
      await request(app.getHttpServer())
        .post(`/content/${contentId}/unschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Try to unschedule again
      const response = await request(app.getHttpServer())
        .post(`/content/${contentId}/unschedule`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not scheduled');
    });

    it('should reject unscheduling non-existent content', async () => {
      await request(app.getHttpServer())
        .post('/content/00000000-0000-0000-0000-000000000000/unschedule')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Content creation with SCHEDULED status', () => {
    it('should create content with SCHEDULED status and future date', async () => {
      const futureDate = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

      const response = await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Scheduled Content on Creation',
          body: 'This content is scheduled on creation',
          excerpt: 'Scheduled excerpt',
          status: 'SCHEDULED',
          scheduledAt: futureDate,
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'SCHEDULED');
      expect(response.body).toHaveProperty('scheduledAt');
      expect(new Date(response.body.scheduledAt).getTime()).toBeGreaterThan(Date.now());

      // Clean up
      await prisma.contentVersion.deleteMany({
        where: { contentId: response.body.id },
      });
      await prisma.content.delete({
        where: { id: response.body.id },
      });
    });

    it('should reject creating SCHEDULED content without scheduledAt', async () => {
      const response = await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Invalid Scheduled Content',
          body: 'Missing scheduledAt',
          status: 'SCHEDULED',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('scheduledAt is required');
    });

    it('should reject creating SCHEDULED content with past date', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();

      const response = await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Invalid Scheduled Content',
          body: 'Past scheduledAt',
          status: 'SCHEDULED',
          scheduledAt: pastDate,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('future date');
    });
  });

  describe('Content update with SCHEDULED status', () => {
    let draftContentId: string;

    beforeEach(async () => {
      // Create a new draft content for each test
      const response = await request(app.getHttpServer())
        .post('/content')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Draft for Update Test',
          body: 'Draft content body',
          status: 'DRAFT',
        });

      draftContentId = response.body.id;
    });

    afterEach(async () => {
      // Clean up
      await prisma.contentVersion.deleteMany({
        where: { contentId: draftContentId },
      });
      await prisma.content.delete({
        where: { id: draftContentId },
      });
    });

    it('should update content to SCHEDULED status with future date', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      const response = await request(app.getHttpServer())
        .patch(`/content/${draftContentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'SCHEDULED',
          scheduledAt: futureDate,
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'SCHEDULED');
      expect(response.body).toHaveProperty('scheduledAt');
    });

    it('should reject updating to SCHEDULED without scheduledAt', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/content/${draftContentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'SCHEDULED',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('scheduledAt is required');
    });

    it('should reject updating to SCHEDULED with past date', async () => {
      const pastDate = new Date(Date.now() - 60000).toISOString();

      const response = await request(app.getHttpServer())
        .patch(`/content/${draftContentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'SCHEDULED',
          scheduledAt: pastDate,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('future date');
    });
  });
});
