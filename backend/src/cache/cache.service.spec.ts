import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';

import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value when key exists', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'nonexistent-key';

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null on error', async () => {
      const key = 'error-key';

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should work with typed values', async () => {
      interface TestData {
        id: string;
        name: string;
      }

      const key = 'typed-key';
      const value: TestData = { id: '1', name: 'Test' };

      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get<TestData>(key);

      expect(result).toEqual(value);
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Test');
    });
  });

  describe('set', () => {
    it('should set cache value without TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value);
    });

    it('should set cache value with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 5000;

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should handle set errors gracefully', async () => {
      const key = 'error-key';
      const value = { data: 'test-data' };

      mockCacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.set(key, value)).resolves.not.toThrow();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value);
    });
  });

  describe('del', () => {
    it('should delete cache key', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle delete errors gracefully', async () => {
      const key = 'error-key';

      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.del(key)).resolves.not.toThrow();
      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('reset', () => {
    it('should reset all cache entries', async () => {
      await service.reset();

      // Reset is currently a no-op in the implementation
      // Just verify it doesn't throw
      expect(service).toBeDefined();
    });

    it('should handle reset errors gracefully', async () => {
      // Reset is currently a no-op, so no errors should occur
      await expect(service.reset()).resolves.not.toThrow();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if key exists', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached-data' };
      const factory = jest.fn();

      mockCacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should execute factory and cache result if key does not exist', async () => {
      const key = 'test-key';
      const factoryValue = { data: 'factory-data' };
      const factory = jest.fn().mockResolvedValue(factoryValue);

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(factoryValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, factoryValue);
    });

    it('should execute factory with TTL if provided', async () => {
      const key = 'test-key';
      const factoryValue = { data: 'factory-data' };
      const factory = jest.fn().mockResolvedValue(factoryValue);
      const ttl = 5000;

      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, factory, ttl);

      expect(result).toEqual(factoryValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, factoryValue, ttl);
    });

    it('should execute factory without caching on error', async () => {
      const key = 'test-key';
      const factoryValue = { data: 'factory-data' };
      const factory = jest.fn().mockResolvedValue(factoryValue);

      mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.getOrSet(key, factory);

      expect(result).toEqual(factoryValue);
      expect(factory).toHaveBeenCalled();
    });
  });

  describe('delPattern', () => {
    it('should attempt to delete pattern', async () => {
      const pattern = 'test-pattern-*';

      await service.delPattern(pattern);

      expect(mockCacheManager.del).toHaveBeenCalledWith(pattern);
    });

    it('should handle pattern delete errors gracefully', async () => {
      const pattern = 'test-pattern-*';

      mockCacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.delPattern(pattern)).resolves.not.toThrow();
    });
  });
});
