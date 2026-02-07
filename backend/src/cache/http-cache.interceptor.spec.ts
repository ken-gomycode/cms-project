import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { CacheService } from './cache.service';
import { HTTP_CACHE_TTL_KEY, HttpCacheInterceptor } from './http-cache.interceptor';

describe('HttpCacheInterceptor', () => {
  let interceptor: HttpCacheInterceptor;
  let cacheService: CacheService;
  let reflector: Reflector;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpCacheInterceptor,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<HttpCacheInterceptor>(HttpCacheInterceptor);
    cacheService = module.get<CacheService>(CacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    const createMockExecutionContext = (
      method: string,
      path: string,
      query: Record<string, string> = {},
    ): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            baseUrl: '',
            path,
            query,
          }),
        }),
        getHandler: jest.fn(),
      } as any;
    };

    const createMockCallHandler = (response: any): CallHandler => {
      return {
        handle: jest.fn(() => of(response)),
      } as any;
    };

    it('should not cache non-GET requests', async () => {
      const context = createMockExecutionContext('POST', '/test');
      const handler = createMockCallHandler({ data: 'test' });

      const result = await interceptor.intercept(context, handler);

      result.subscribe();

      expect(mockCacheService.get).not.toHaveBeenCalled();
      expect(handler.handle).toHaveBeenCalled();
    });

    it('should return cached response if available', async () => {
      const context = createMockExecutionContext('GET', '/test');
      const cachedData = { data: 'cached' };
      const handler = createMockCallHandler({ data: 'new' });

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await interceptor.intercept(context, handler);

      result.subscribe((data) => {
        expect(data).toEqual(cachedData);
      });

      expect(mockCacheService.get).toHaveBeenCalledWith('http:GET:/test');
      expect(handler.handle).not.toHaveBeenCalled();
    });

    it('should cache response on cache miss', async () => {
      const context = createMockExecutionContext('GET', '/test');
      const responseData = { data: 'new' };
      const handler = createMockCallHandler(responseData);

      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const result = await interceptor.intercept(context, handler);

      await new Promise<void>((resolve) => {
        result.subscribe({
          next: (data) => {
            expect(data).toEqual(responseData);
          },
          complete: () => resolve(),
        });
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockCacheService.get).toHaveBeenCalledWith('http:GET:/test');
      expect(handler.handle).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'http:GET:/test',
        responseData,
        60000, // default TTL
      );
    });

    it('should use custom TTL from decorator', async () => {
      const context = createMockExecutionContext('GET', '/test');
      const responseData = { data: 'new' };
      const handler = createMockCallHandler(responseData);
      const customTTL = 30000;

      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(customTTL);

      const result = await interceptor.intercept(context, handler);

      await new Promise<void>((resolve) => {
        result.subscribe({
          next: (data) => {
            expect(data).toEqual(responseData);
          },
          complete: () => resolve(),
        });
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockReflector.get).toHaveBeenCalledWith(HTTP_CACHE_TTL_KEY, context.getHandler());
      expect(mockCacheService.set).toHaveBeenCalledWith('http:GET:/test', responseData, customTTL);
    });

    it('should include query parameters in cache key', async () => {
      const context = createMockExecutionContext('GET', '/test', {
        page: '1',
        limit: '10',
      });
      const responseData = { data: 'new' };
      const handler = createMockCallHandler(responseData);

      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const result = await interceptor.intercept(context, handler);

      await new Promise<void>((resolve) => {
        result.subscribe({
          next: (data) => {
            expect(data).toEqual(responseData);
          },
          complete: () => resolve(),
        });
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockCacheService.get).toHaveBeenCalledWith('http:GET:/test?page=1&limit=10');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'http:GET:/test?page=1&limit=10',
        responseData,
        60000,
      );
    });

    it('should not cache if response is null or undefined', async () => {
      const context = createMockExecutionContext('GET', '/test');
      const handler = createMockCallHandler(null);

      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const result = await interceptor.intercept(context, handler);

      await new Promise<void>((resolve) => {
        result.subscribe({
          complete: () => resolve(),
        });
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler.handle).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });
});
