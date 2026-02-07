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
  score: number;
  checks: SeoCheck[];

  constructor(score: number, checks: SeoCheck[]) {
    this.score = score;
    this.checks = checks;
  }
}
