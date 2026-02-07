import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Content Scheduler Service
 * Handles automatic publishing of scheduled content via cron jobs
 */
@Injectable()
export class ContentSchedulerService {
  private readonly logger = new Logger(ContentSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron job that runs every minute to check for scheduled content
   * Publishes content where scheduledAt <= now() and status = SCHEDULED
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledContent(): Promise<void> {
    this.logger.debug('Running scheduled content check...');

    try {
      const now = new Date();

      // Find all scheduled content that should be published
      const scheduledContent = await this.prisma.content.findMany({
        where: {
          status: ContentStatus.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
        },
      });

      if (scheduledContent.length === 0) {
        this.logger.debug('No scheduled content to publish');
        return;
      }

      this.logger.log(`Found ${scheduledContent.length} scheduled content item(s) to publish`);

      // Publish each scheduled content
      for (const content of scheduledContent) {
        try {
          await this.prisma.content.update({
            where: { id: content.id },
            data: {
              status: ContentStatus.PUBLISHED,
              publishedAt: now,
            },
          });

          this.logger.log(`Published scheduled content: "${content.title}" (ID: ${content.id})`);
        } catch (error) {
          this.logger.error(
            `Failed to publish scheduled content: "${content.title}" (ID: ${content.id})`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error in scheduled content check',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Manually trigger the scheduled content check (for testing)
   */
  async triggerScheduledContentCheck(): Promise<number> {
    this.logger.log('Manual trigger of scheduled content check');

    const now = new Date();

    const result = await this.prisma.content.updateMany({
      where: {
        status: ContentStatus.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: now,
      },
    });

    this.logger.log(`Published ${result.count} scheduled content item(s)`);
    return result.count;
  }
}
