import { UserRole, ContentStatus, CommentStatus } from './enums.types';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
  avatar: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User without sensitive fields (for public display)
 */
export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category entity
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contents: number;
  };
}

/**
 * Tag entity
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contents: number;
  };
}

/**
 * Media entity
 */
export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  uploadedById: string;
  uploadedBy?: PublicUser;
  createdAt: string;
  updatedAt: string;
}

/**
 * SEO Metadata entity
 */
export interface SeoMetadata {
  id: string;
  contentId: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonicalUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Content entity
 */
export interface Content {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featuredImage: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  authorId: string;
  author?: PublicUser;
  categoryId: string | null;
  category?: Category;
  tags?: Tag[];
  seoMetadata?: SeoMetadata;
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
    versions: number;
  };
}

/**
 * Comment entity
 */
export interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  status: CommentStatus;
  contentId: string;
  content?: Content;
  parentId: string | null;
  parent?: Comment;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    replies: number;
  };
}

/**
 * Content Version entity
 */
export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  title: string;
  body: string;
  excerpt: string | null;
  createdById: string;
  createdBy?: PublicUser;
  createdAt: string;
}

/**
 * Analytics entity
 */
export interface Analytics {
  id: string;
  contentId: string;
  content?: Content;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit Log entity
 */
export interface AuditLog {
  id: string;
  userId: string;
  user?: PublicUser;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * Refresh Token entity (not typically exposed to frontend, but included for completeness)
 */
export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}
