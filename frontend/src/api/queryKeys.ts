/**
 * Hierarchical query keys factory for type-safe cache management
 */

import {
  ContentFilterParams,
  CommentFilterParams,
  UserFilterParams,
  MediaFilterParams,
  FilterParams,
} from '@/types';

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilterParams) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Content
  content: {
    all: ['content'] as const,
    lists: () => [...queryKeys.content.all, 'list'] as const,
    list: (filters: ContentFilterParams) => [...queryKeys.content.lists(), filters] as const,
    details: () => [...queryKeys.content.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.content.details(), id] as const,
    bySlug: (slug: string) => [...queryKeys.content.all, 'slug', slug] as const,
    versions: (id: string) => [...queryKeys.content.detail(id), 'versions'] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    lists: () => [...queryKeys.categories.all, 'list'] as const,
    list: (filters: FilterParams) => [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },

  // Tags
  tags: {
    all: ['tags'] as const,
    lists: () => [...queryKeys.tags.all, 'list'] as const,
    list: (filters: FilterParams) => [...queryKeys.tags.lists(), filters] as const,
    details: () => [...queryKeys.tags.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tags.details(), id] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (filters: MediaFilterParams) => [...queryKeys.media.lists(), filters] as const,
    details: () => [...queryKeys.media.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.media.details(), id] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (filters: CommentFilterParams) => [...queryKeys.comments.lists(), filters] as const,
    details: () => [...queryKeys.comments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.comments.details(), id] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    content: (contentId: string) => [...queryKeys.analytics.all, 'content', contentId] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['auditLogs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters: FilterParams) => [...queryKeys.auditLogs.lists(), filters] as const,
  },
};
