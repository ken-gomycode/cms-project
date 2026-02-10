import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ContentController } from './content.controller';
import { ContentService } from './content.service';

/**
 * Content Module
 * Manages content (articles/posts) functionality
 */
@Module({
  imports: [PrismaModule, AnalyticsModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
