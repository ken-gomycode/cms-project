import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import configuration, { validationSchema } from './config/configuration';
import { ContentModule } from './content/content.module';
import { MediaModule } from './media/media.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SearchModule } from './search/search.module';
import { SeoModule } from './seo/seo.module';
import { TagsModule } from './tags/tags.module';
import { UsersModule } from './users/users.module';
import { VersionsModule } from './versions/versions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // Rate limiting configuration — disabled in development for testing
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') !== 'production';
        return [
          {
            name: 'default',
            ttl: 60000,
            limit: isDev ? 10000 : 60, // Very high limit in dev for testing
          },
        ];
      },
    }),
    CacheModule,
    PrismaModule,
    AuditModule,
    SchedulerModule,
    AuthModule,
    UsersModule,
    MediaModule,
    CategoriesModule,
    TagsModule,
    ContentModule,
    VersionsModule,
    CommentsModule,
    SeoModule,
    SearchModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
