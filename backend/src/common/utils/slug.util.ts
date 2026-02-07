/**
 * Generate a URL-friendly slug from a string
 * @param text The text to slugify
 * @returns The slugified string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normalize Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Trim hyphens from start
    .replace(/-+$/, ''); // Trim hyphens from end
}

/**
 * Generate a unique slug by appending a suffix if needed
 * @param baseSlug The base slug
 * @param existingSlug An existing slug to check against
 * @param suffix The suffix counter to append
 * @returns A unique slug
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlug?: string,
  suffix: number = 1,
): string {
  if (!existingSlug) {
    return baseSlug;
  }

  const newSlug = `${baseSlug}-${suffix}`;
  return newSlug === existingSlug
    ? generateUniqueSlug(baseSlug, existingSlug, suffix + 1)
    : newSlug;
}
