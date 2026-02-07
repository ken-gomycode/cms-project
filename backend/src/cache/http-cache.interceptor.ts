import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, of, tap } from 'rxjs';

import { CacheService } from './cache.service';

/**
 * Metadata key for configuring HTTP cache TTL
 */
export const HTTP_CACHE_TTL_KEY = 'http_cache_ttl';

/**
 * Decorator to set HTTP cache TTL for a route
 */
export const HttpCacheTTL = (ttl: number): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(HTTP_CACHE_TTL_KEY, ttl, descriptor.value);
    return descriptor;
  };
};

/**
 * HTTP Cache Interceptor
 * Caches GET responses by URL + query parameters
 * Configurable TTL via @HttpCacheTTL decorator
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);
  private readonly defaultTTL = 60000; // 60 seconds in milliseconds

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Generate cache key from URL and query parameters
    const cacheKey = this.generateCacheKey(request);

    // Try to get from cache
    const cachedResponse = await this.cacheService.get(cacheKey);

    if (cachedResponse !== null) {
      this.logger.debug(`Returning cached response for: ${cacheKey}`);
      return of(cachedResponse);
    }

    // Get TTL from decorator or use default
    const ttl =
      this.reflector.get<number>(HTTP_CACHE_TTL_KEY, context.getHandler()) || this.defaultTTL;

    // Execute request and cache response
    return next.handle().pipe(
      tap(async (response) => {
        if (response) {
          this.logger.debug(`Caching response for: ${cacheKey} with TTL: ${ttl}ms`);
          await this.cacheService.set(cacheKey, response, ttl);
        }
      }),
    );
  }

  /**
   * Generate cache key from request URL and query parameters
   * Format: http:METHOD:path?query
   */
  private generateCacheKey(request: Request): string {
    const baseUrl = request.baseUrl + request.path;
    const queryString = new URLSearchParams(request.query as Record<string, string>).toString();

    const key = `http:${request.method}:${baseUrl}${queryString ? `?${queryString}` : ''}`;

    return key;
  }
}
