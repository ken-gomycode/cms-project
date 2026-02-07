import { ArgumentMetadata } from '@nestjs/common';

import { SanitizationPipe } from './sanitization.pipe';

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  describe('String Sanitization', () => {
    it('should remove dangerous script tags', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<script>alert("XSS")</script>Hello';
      const result = pipe.transform(malicious, metadata);

      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers from HTML', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<img src="x" onerror="alert(1)">';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should strip iframe tags', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<iframe src="http://evil.com"></iframe>Test';
      const result = pipe.transform(malicious, metadata);

      expect(result).toBe('Test');
      expect(result).not.toContain('iframe');
    });

    it('should allow safe HTML tags', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const safe = '<p>Hello <strong>world</strong></p>';
      const result = pipe.transform(safe, metadata);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
    });

    it('should remove null bytes', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = 'Hello\0World';
      const result = pipe.transform(malicious, metadata);

      expect(result).toBe('HelloWorld');
      expect(result).not.toContain('\0');
    });

    it('should trim whitespace', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const input = '  Hello World  ';
      const result = pipe.transform(input, metadata);

      expect(result).toBe('Hello World');
    });

    it('should handle XSS via data URIs', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('data:');
      expect(result).not.toContain('script');
    });

    it('should sanitize JavaScript protocol in links', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<a href="javascript:alert(1)">Click</a>';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('javascript:');
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize strings in objects', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const input = {
        name: '<script>alert(1)</script>John',
        email: 'test@test.com',
      };
      const result = pipe.transform(input, metadata);

      expect(result.name).toBe('John');
      expect(result.email).toBe('test@test.com');
    });

    it('should sanitize nested objects', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const input = {
        user: {
          name: '<img src=x onerror=alert(1)>Alice',
          bio: '<p>Hello</p>',
        },
      };
      const result = pipe.transform(input, metadata);

      expect(result.user.name).toBe('Alice');
      expect(result.user.bio).toBe('<p>Hello</p>');
      expect(result.user.name).not.toContain('onerror');
    });

    it('should sanitize arrays of strings', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const input = [
        '<script>alert(1)</script>Hello',
        'Safe string',
        '<img src=x onerror=alert(1)>',
      ];
      const result = pipe.transform(input, metadata);

      expect(result[0]).toBe('Hello');
      expect(result[1]).toBe('Safe string');
      expect(result[2]).toBe('');
    });

    it('should sanitize arrays of objects', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const input = [{ name: '<script>alert(1)</script>John' }, { name: 'Jane' }];
      const result = pipe.transform(input, metadata);

      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const result = pipe.transform(null, metadata);

      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const result = pipe.transform(undefined, metadata);

      expect(result).toBeUndefined();
    });

    it('should handle empty strings', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const result = pipe.transform('', metadata);

      expect(result).toBe('');
    });

    it('should handle numbers', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const result = pipe.transform(123, metadata);

      expect(result).toBe(123);
    });

    it('should handle booleans', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const result = pipe.transform(true, metadata);

      expect(result).toBe(true);
    });

    it('should skip transformation for Number type', () => {
      const metadata: ArgumentMetadata = { type: 'body', metatype: Number };
      const result = pipe.transform(123, metadata);

      expect(result).toBe(123);
    });

    it('should skip transformation for Boolean type', () => {
      const metadata: ArgumentMetadata = { type: 'body', metatype: Boolean };
      const result = pipe.transform(true, metadata);

      expect(result).toBe(true);
    });
  });

  describe('Advanced XSS Payloads', () => {
    it('should block SVG-based XSS', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<svg/onload=alert(1)>';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
    });

    it('should block XML-based XSS', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<?xml version="1.0"?><script>alert(1)</script>';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('should block CSS expression attacks', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<div style="background:url(javascript:alert(1))">Test</div>';
      const result = pipe.transform(malicious, metadata);

      expect(result).not.toContain('javascript:');
    });

    it('should handle mixed case script tags', () => {
      const metadata: ArgumentMetadata = { type: 'body' };
      const malicious = '<ScRiPt>alert(1)</ScRiPt>Hello';
      const result = pipe.transform(malicious, metadata);

      expect(result).toBe('Hello');
      expect(result).not.toContain('script');
    });
  });
});
