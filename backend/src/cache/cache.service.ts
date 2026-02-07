import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Cache Service
 * Provides typed cache operations with cache-aside pattern support
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get cached value with type safety
   * Returns null if key doesn't exist or value is expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return value;
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cache value with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional, uses default if not provided)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (ttl !== undefined) {
        await this.cacheManager.set(key, value, ttl);
      } else {
        await this.cacheManager.set(key, value);
      }
      this.logger.debug(`Cache set for key: ${key}${ttl ? ` with TTL: ${ttl}ms` : ''}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete specific cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Clear all cache entries
   * Note: This is a placeholder implementation for in-memory cache
   * For production Redis implementation, this would use FLUSHDB command
   */
  async reset(): Promise<void> {
    try {
      // Cache manager v5 doesn't have a built-in reset method
      // For now, this is a no-op. In production with Redis, you would use FLUSHDB
      this.logger.debug('Cache reset requested (no-op for current cache-manager implementation)');
    } catch (error) {
      this.logger.error(`Error resetting cache: ${error.message}`);
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   * If key exists, return cached value
   * If key doesn't exist, execute factory function, cache result, and return it
   *
   * @param key Cache key
   * @param factory Function to execute if cache miss
   * @param ttl Time to live in milliseconds (optional)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      // Try to get from cache
      const cachedValue = await this.get<T>(key);

      if (cachedValue !== null) {
        return cachedValue;
      }

      // Cache miss - execute factory
      this.logger.debug(`Cache miss for key: ${key}, executing factory`);
      const value = await factory();

      // Cache the result
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}: ${error.message}`);
      // On error, execute factory without caching
      return factory();
    }
  }

  /**
   * Delete multiple cache keys matching a pattern
   * Note: This is a simple implementation that deletes exact keys
   * For Redis, you could use SCAN with pattern matching
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // For in-memory cache, we can't efficiently implement pattern matching
      // For Redis, you would use SCAN command
      this.logger.debug(`Pattern delete requested for: ${pattern}`);
      // This is a placeholder - implement based on your cache store capabilities
      await this.del(pattern);
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Add member to set (Redis-specific operation)
   * Placeholder for in-memory cache - not implemented
   */
  async sadd(key: string, member: string): Promise<number> {
    this.logger.debug(`SADD operation not supported in cache-manager (key: ${key})`);
    return 0;
  }

  /**
   * Check if member exists in set (Redis-specific operation)
   * Placeholder for in-memory cache - always returns false
   */
  async sismember(key: string, member: string): Promise<boolean> {
    this.logger.debug(`SISMEMBER operation not supported in cache-manager (key: ${key})`);
    return false;
  }

  /**
   * Set expiration on key (Redis-specific operation)
   * Placeholder for in-memory cache - not implemented
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    this.logger.debug(`EXPIRE operation not supported in cache-manager (key: ${key})`);
    return false;
  }
}
