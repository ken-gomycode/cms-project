import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInterceptor } from './analytics.interceptor';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics Module
 * Handles content view tracking and analytics reporting
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsInterceptor],
  exports: [AnalyticsService, AnalyticsInterceptor],
})
export class AnalyticsModule {}
