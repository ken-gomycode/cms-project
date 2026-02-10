import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { SeoCheck, SeoScoreDto } from './dto/seo-score.dto';

/**
 * SEO Analyzer Service
 * Analyzes content and SEO metadata to generate SEO score
 * Checks multiple SEO factors and provides actionable feedback
 */
@Injectable()
export class SeoAnalyzerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze SEO quality for content
   * Returns score (0-100) and detailed check results
   */
  async analyze(contentId: string): Promise<SeoScoreDto> {
    // Fetch content with SEO metadata and featured image
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        seoMetadata: true,
        featuredImage: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    const checks: SeoCheck[] = [];

    // Check 1: metaTitle length (50-60 chars = good)
    const titleCheck = this.checkMetaTitleLength(content.seoMetadata?.metaTitle);
    checks.push(titleCheck);

    // Check 2: metaDescription length (150-160 chars = good)
    const descriptionCheck = this.checkMetaDescriptionLength(content.seoMetadata?.metaDescription);
    checks.push(descriptionCheck);

    // Check 3: Content word count (>300 = good)
    const wordCountCheck = this.checkContentWordCount(content.body);
    checks.push(wordCountCheck);

    // Check 4: Has headings in body (check for # or <h> tags)
    const headingsCheck = this.checkContentHeadings(content.body);
    checks.push(headingsCheck);

    // Check 5: Featured image has alt text
    const altTextCheck = this.checkFeaturedImageAltText(content.featuredImage);
    checks.push(altTextCheck);

    // Calculate overall score
    const passedChecks = checks.filter((check) => check.passed).length;
    const score = Math.round((passedChecks / checks.length) * 100);

    return new SeoScoreDto(score, checks);
  }

  /**
   * Check if metaTitle length is optimal (50-60 chars)
   */
  private checkMetaTitleLength(metaTitle?: string | null): SeoCheck {
    if (!metaTitle) {
      return {
        name: 'Meta Title Length',
        passed: false,
        message: 'No meta title set. Recommended: 50-60 characters.',
      };
    }

    const length = metaTitle.length;

    if (length >= 50 && length <= 60) {
      return {
        name: 'Meta Title Length',
        passed: true,
        message: `Meta title length is optimal (${length} characters).`,
      };
    } else if (length < 50) {
      return {
        name: 'Meta Title Length',
        passed: false,
        message: `Meta title is too short (${length} characters). Recommended: 50-60 characters.`,
      };
    } else {
      return {
        name: 'Meta Title Length',
        passed: false,
        message: `Meta title is too long (${length} characters). Recommended: 50-60 characters.`,
      };
    }
  }

  /**
   * Check if metaDescription length is optimal (150-160 chars)
   */
  private checkMetaDescriptionLength(metaDescription?: string | null): SeoCheck {
    if (!metaDescription) {
      return {
        name: 'Meta Description Length',
        passed: false,
        message: 'No meta description set. Recommended: 150-160 characters.',
      };
    }

    const length = metaDescription.length;

    if (length >= 150 && length <= 160) {
      return {
        name: 'Meta Description Length',
        passed: true,
        message: `Meta description length is optimal (${length} characters).`,
      };
    } else if (length < 150) {
      return {
        name: 'Meta Description Length',
        passed: false,
        message: `Meta description is too short (${length} characters). Recommended: 150-160 characters.`,
      };
    } else {
      return {
        name: 'Meta Description Length',
        passed: false,
        message: `Meta description is too long (${length} characters). Recommended: 150-160 characters.`,
      };
    }
  }

  /**
   * Check if content has sufficient word count (>300 = good)
   */
  private checkContentWordCount(body: string): SeoCheck {
    // Strip HTML tags
    const plainText = body.replace(/<[^>]*>/g, ' ');

    // Count words (split by whitespace and filter empty strings)
    const words = plainText.split(/\s+/).filter((word) => word.trim().length > 0);
    const wordCount = words.length;

    if (wordCount >= 300) {
      return {
        name: 'Content Word Count',
        passed: true,
        message: `Content has sufficient word count (${wordCount} words).`,
      };
    } else {
      return {
        name: 'Content Word Count',
        passed: false,
        message: `Content word count is low (${wordCount} words). Recommended: 300+ words for better SEO.`,
      };
    }
  }

  /**
   * Check if content has headings (Markdown # or HTML <h> tags)
   */
  private checkContentHeadings(body: string): SeoCheck {
    // Check for Markdown headings (# ## ### etc.)
    const markdownHeadings = /^#{1,6}\s+.+$/m.test(body);

    // Check for HTML headings (<h1> <h2> etc.)
    const htmlHeadings = /<h[1-6][^>]*>.*<\/h[1-6]>/i.test(body);

    if (markdownHeadings || htmlHeadings) {
      return {
        name: 'Content Structure (Headings)',
        passed: true,
        message: 'Content includes headings for better structure and SEO.',
      };
    } else {
      return {
        name: 'Content Structure (Headings)',
        passed: false,
        message:
          'No headings found in content. Add headings (H1-H6) to improve content structure and SEO.',
      };
    }
  }

  /**
   * Check if featured image has alt text
   */
  private checkFeaturedImageAltText(featuredImage?: any): SeoCheck {
    if (!featuredImage) {
      return {
        name: 'Featured Image Alt Text',
        passed: false,
        message: 'No featured image set. Images with alt text improve accessibility and SEO.',
      };
    }

    if (featuredImage.altText && featuredImage.altText.trim().length > 0) {
      return {
        name: 'Featured Image Alt Text',
        passed: true,
        message: 'Featured image has alt text for accessibility and SEO.',
      };
    } else {
      return {
        name: 'Featured Image Alt Text',
        passed: false,
        message:
          'Featured image is missing alt text. Add descriptive alt text for better accessibility and SEO.',
      };
    }
  }
}
