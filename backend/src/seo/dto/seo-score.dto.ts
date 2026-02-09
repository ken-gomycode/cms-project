import { ApiProperty } from '@nestjs/swagger';

/**
 * Interface representing a single SEO check result
 */
export interface SeoCheck {
  name: string;
  passed: boolean;
  message: string;
}

/**
 * DTO for SEO score analysis response
 * Contains overall score and detailed check results
 */
export class SeoScoreDto {
  @ApiProperty({ description: 'Overall SEO score (0-100)', example: 85 })
  score: number;

  @ApiProperty({ description: 'Array of SEO check results', isArray: true })
  checks: SeoCheck[];

  constructor(score: number, checks: SeoCheck[]) {
    this.score = score;
    this.checks = checks;
  }
}
