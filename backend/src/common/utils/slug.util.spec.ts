import { slugify, generateUniqueSlug } from './slug.util';

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('this is a test')).toBe('this-is-a-test');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello@World! 123')).toBe('helloworld-123');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('hello    world')).toBe('hello-world');
  });

  it('should handle multiple hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('should trim hyphens from start and end', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('should handle Unicode characters', () => {
    expect(slugify('Héllo Wörld')).toBe('hello-world');
  });

  it('should handle accented characters', () => {
    expect(slugify('café résumé naïve')).toBe('cafe-resume-naive');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });

  it('should handle numbers', () => {
    expect(slugify('Article 123')).toBe('article-123');
  });

  it('should handle underscores (keep them)', () => {
    expect(slugify('hello_world')).toBe('hello_world');
  });

  it('should handle mixed case with numbers', () => {
    expect(slugify('React 18.2.0 Released')).toBe('react-1820-released');
  });

  it('should handle long text', () => {
    const longText = 'This is a very long title that should be converted to a slug properly';
    expect(slugify(longText)).toBe(
      'this-is-a-very-long-title-that-should-be-converted-to-a-slug-properly',
    );
  });

  it('should handle trailing and leading whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  it('should handle Chinese characters', () => {
    expect(slugify('你好世界')).toBe('');
  });

  it('should handle mixed language', () => {
    expect(slugify('Hello 世界 World')).toBe('hello-world');
  });
});

describe('generateUniqueSlug', () => {
  it('should return base slug if no existing slug', () => {
    expect(generateUniqueSlug('hello-world')).toBe('hello-world');
  });

  it('should return base slug if existing slug is different', () => {
    expect(generateUniqueSlug('hello-world', 'goodbye-world')).toBe('hello-world-1');
  });

  it('should append suffix 1 for first duplicate', () => {
    expect(generateUniqueSlug('hello-world', 'hello-world')).toBe('hello-world-1');
  });

  it('should increment suffix for multiple duplicates', () => {
    expect(generateUniqueSlug('hello-world', 'hello-world-1', 2)).toBe('hello-world-2');
  });

  it('should handle undefined existing slug', () => {
    expect(generateUniqueSlug('hello-world', undefined)).toBe('hello-world');
  });

  it('should recursively find unique slug', () => {
    // When suffix 1 generates 'test-1' which matches existing, it should recurse to 'test-2'
    const baseSlug = 'test';
    const result = generateUniqueSlug(baseSlug, 'test-1', 1);
    expect(result).toBe('test-2');
  });
});
