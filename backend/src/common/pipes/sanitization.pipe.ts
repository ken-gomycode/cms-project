import { ArgumentMetadata, Injectable, PipeTransform, Type } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Global pipe that sanitizes all string inputs to prevent XSS attacks
 * Strips dangerous HTML tags and attributes from user input
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    // Allow only safe tags
    allowedTags: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Disallow iframe and script tags
    disallowedTagsMode: 'discard',
    // Self-close tags like <br>
    selfClosing: ['br'],
  };

  transform(value: any, metadata: ArgumentMetadata): any {
    // Skip transformation for specific types
    if (this.shouldSkip(metadata)) {
      return value;
    }

    return this.sanitizeValue(value);
  }

  /**
   * Determine if we should skip sanitization for this metadata
   */
  private shouldSkip(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;

    // Skip for primitive types that can't be objects
    const typesToSkip: Array<Type<any>> = [Boolean, Number, Date, Array];
    return typesToSkip.some((type) => metatype === type);
  }

  /**
   * Recursively sanitize values
   */
  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle strings
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    // Handle objects
    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    // Return other types as-is
    return value;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string): string {
    // Trim whitespace
    let sanitized = value.trim();

    // Remove HTML tags and dangerous content
    sanitized = sanitizeHtml(sanitized, this.sanitizeOptions);

    // Additional sanitization: remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Sanitize an object by sanitizing all its string properties
   */
  private sanitizeObject(obj: any): any {
    const sanitized: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = this.sanitizeValue(obj[key]);
      }
    }

    return sanitized;
  }
}
