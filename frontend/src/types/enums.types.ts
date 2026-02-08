/**
 * User role enumeration
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
  SUBSCRIBER = 'SUBSCRIBER',
}

/**
 * Content status enumeration
 */
export enum ContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  SCHEDULED = 'SCHEDULED',
}

/**
 * Comment status enumeration
 */
export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SPAM = 'SPAM',
}
