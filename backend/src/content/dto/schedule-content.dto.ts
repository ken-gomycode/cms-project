import { IsDateString } from 'class-validator';

/**
 * DTO for scheduling content
 */
export class ScheduleContentDto {
  @IsDateString()
  scheduledAt: string;
}
