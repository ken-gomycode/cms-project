import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/**
 * DTO for scheduling content
 */
export class ScheduleContentDto {
  @ApiProperty({
    description: 'Scheduled publish date (ISO 8601 format)',
    example: '2026-03-01T10:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;
}
