import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContentStatus } from '@prisma/client';
import * as request from 'supertest';

import { PrismaService } from '../prisma/prisma.service';

import { SearchModule } from './search.module';

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SearchModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /search', () => {
    it('should return 200 with search results', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ q: 'test', page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('totalPages');
        });
    });

    it('should return 200 without query parameter', () => {
      return request(app.getHttpServer())
        .get('/search')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter by category', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ categoryId: '00000000-0000-0000-0000-000000000001' })
        .expect(200);
    });

    it('should filter by tag', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ tagId: '00000000-0000-0000-0000-000000000001' })
        .expect(200);
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ status: ContentStatus.PUBLISHED })
        .expect(200);
    });

    it('should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/search')
        .query({ page: 2, limit: 5 })
        .expect(200)
        .expect((res) => {
          expect(res.body.meta.page).toBe(2);
          expect(res.body.meta.limit).toBe(5);
        });
    });

    it('should validate invalid page parameter', () => {
      return request(app.getHttpServer()).get('/search').query({ page: 0 }).expect(400);
    });

    it('should validate invalid limit parameter', () => {
      return request(app.getHttpServer()).get('/search').query({ limit: 0 }).expect(400);
    });
  });

  describe('GET /search/suggest', () => {
    it('should return autocomplete suggestions', () => {
      return request(app.getHttpServer())
        .get('/search/suggest')
        .query({ q: 'te' })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((item: any) => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('title');
            expect(item).toHaveProperty('slug');
          });
        });
    });

    it('should validate query parameter exists', () => {
      return request(app.getHttpServer()).get('/search/suggest').expect(400);
    });

    it('should validate query parameter minimum length', () => {
      return request(app.getHttpServer()).get('/search/suggest').query({ q: 'a' }).expect(400);
    });

    it('should accept valid 2-character query', () => {
      return request(app.getHttpServer()).get('/search/suggest').query({ q: 'ab' }).expect(200);
    });

    it('should limit results to 5 suggestions', () => {
      return request(app.getHttpServer())
        .get('/search/suggest')
        .query({ q: 'te' })
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });
  });
});
