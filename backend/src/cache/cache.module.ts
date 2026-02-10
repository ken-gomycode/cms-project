import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';

import { CacheService } from './cache.service';

/**
 * Cache Module
 * Configures caching with Redis (preferred) or in-memory fallback
 * Logs the active cache store on initialization
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisUrl = configService.get<string>('REDIS_URL');

        // Try to connect to Redis
        if (redisUrl) {
          try {
            logger.log(`Attempting to connect to Redis at ${redisUrl}`);

            const store = await redisStore({
              url: redisUrl,
              socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                  if (retries > 3) {
                    logger.error(
                      'Redis connection failed after 3 retries, falling back to in-memory cache',
                    );
                    return false; // Stop reconnecting
                  }
                  return Math.min(retries * 100, 3000);
                },
              },
            });

            logger.log('Successfully connected to Redis cache store');

            return {
              store,
              ttl: 60000, // Default TTL: 60 seconds (in milliseconds)
            };
          } catch (error) {
            logger.error(
              `Failed to connect to Redis: ${error.message}. Falling back to in-memory cache`,
            );
            logger.log('Using in-memory cache store');

            return {
              ttl: 60000, // Default TTL: 60 seconds (in milliseconds)
            };
          }
        }

        // No Redis URL provided, use in-memory cache
        logger.log('No Redis URL configured, using in-memory cache store');

        return {
          ttl: 60000, // Default TTL: 60 seconds (in milliseconds)
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
