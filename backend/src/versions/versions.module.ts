import { Module } from '@nestjs/common';

import { ContentModule } from '../content/content.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

/**
 * Versions Module
 * Handles content version history, comparison, and rollback operations
 */
@Module({
  imports: [PrismaModule, ContentModule],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
