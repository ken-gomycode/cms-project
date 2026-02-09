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
  firstName: string;
  lastName: string;
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
  body: string;
  excerpt?: string;
  status?: ContentStatus;
  categoryIds?: string[];
  tagIds?: string[];
  featuredImageId?: string;
  scheduledAt?: string;
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
  parentId?: string;
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
  body: string;
  authorName?: string;
  authorEmail?: string;
  contentId: string;
  parentId?: string;
}

/**
 * Update comment request
 */
export interface UpdateCommentRequest {
  body?: string;
  status?: CommentStatus;
}

/**
 * Moderate comment request
 */
export interface ModerateCommentRequest {
  status: CommentStatus.APPROVED | CommentStatus.REJECTED | CommentStatus.SPAM;
}

/**
 * Batch moderate comments request
 */
export interface BatchModerateCommentsRequest {
  commentIds: string[];
  status: CommentStatus.APPROVED | CommentStatus.REJECTED | CommentStatus.SPAM;
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
 * Dashboard statistics response
 */
export interface DashboardStats {
  contentByStatus: Record<ContentStatus, number>;
  contentByRole: Record<string, number>;
  views: {
    last30Days: { total: number; unique: number };
    allTime: { total: number; unique: number };
  };
  totalContent: number;
}

/**
 * Top content item for dashboard
 */
export interface TopContentItem {
  content: {
    id: string;
    title: string;
    slug: string;
    status: ContentStatus;
    publishedAt: string | null;
    author: { id: string; firstName: string; lastName: string; email: string };
  };
  views: number;
  uniqueVisitors: number;
}

/**
 * Error response
 */
export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}
