import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

/**
 * SEO Module
 * Manages SEO metadata and analysis functionality
 */
@Module({
  imports: [PrismaModule],
  controllers: [SeoController],
  providers: [SeoService, SeoAnalyzerService],
  exports: [SeoService, SeoAnalyzerService],
})
export class SeoModule {}
