import type { User } from './entities.types';
import { UserRole, ContentStatus, CommentStatus } from './enums.types';

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Common filter params
 */
export interface FilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Content filter params
 */
export interface ContentFilterParams extends FilterParams {
  status?: ContentStatus;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
}

/**
 * Comment filter params
 */
export interface CommentFilterParams extends FilterParams {
  status?: CommentStatus;
  contentId?: string;
}

/**
 * User filter params
 */
export interface UserFilterParams extends FilterParams {
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Media filter params
 */
export interface MediaFilterParams extends FilterParams {
  mimeType?: string;
  uploadedById?: string;
}

/**
 * Create content request
 */
export interface CreateContentRequest {
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  featuredImage?: string;
  status: ContentStatus;
  publishedAt?: string;
  scheduledAt?: string;
  categoryId?: string;
  tagIds?: string[];
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonicalUrl?: string;
  };
}

/**
 * Update content request
 */
export interface UpdateContentRequest extends Partial<CreateContentRequest> {}

/**
 * Create category request
 */
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
}

/**
 * Update category request
 */
export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

/**
 * Create tag request
 */
export interface CreateTagRequest {
  name: string;
  slug?: string;
}

/**
 * Update tag request
 */
export interface UpdateTagRequest extends Partial<CreateTagRequest> {}

/**
 * Create comment request
 */
export interface CreateCommentRequest {
  content: string;
  authorName: string;
  authorEmail: string;
  contentId: string;
  parentId?: string;
}

/**
 * Update comment request
 */
export interface UpdateCommentRequest {
  content?: string;
  status?: CommentStatus;
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  bio?: string;
  avatar?: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
  password?: string;
}

/**
 * Upload media request (FormData)
 */
export interface UploadMediaRequest {
  file: File;
  alt?: string;
  caption?: string;
}

/**
 * Update media request
 */
export interface UpdateMediaRequest {
  alt?: string;
  caption?: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}
