import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from '../prisma/prisma.module';
import { ContentSchedulerService } from './content-scheduler.service';

/**
 * Scheduler Module
 * Configures scheduling functionality for the application
 * Handles automatic publishing of scheduled content
 */
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [ContentSchedulerService],
  exports: [ContentSchedulerService],
})
export class SchedulerModule {}
