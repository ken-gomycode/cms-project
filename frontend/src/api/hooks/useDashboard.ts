/**
 * Dashboard-specific React Query hooks
 *
 * Provides hooks for:
 * - Dashboard statistics (content by status/role, views)
 * - Top content analytics
 * - Recent pending comments
 * - Comment status moderation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/api/queryKeys';
import type {
  DashboardStats,
  TopContentItem,
  PaginatedResponse,
  UpdateCommentRequest,
} from '@/types/api.types';
import type { Comment } from '@/types/entities.types';
import { CommentStatus } from '@/types/enums.types';

/**
 * Fetch dashboard statistics
 * Requires EDITOR or ADMIN role
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DashboardStats>('/analytics/dashboard');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

/**
 * Fetch top content by views
 * Requires EDITOR or ADMIN role
 */
export const useTopContent = () => {
  return useQuery({
    queryKey: [...queryKeys.analytics.all, 'top-content'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<TopContentItem[]>('/analytics/top-content');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Fetch recent pending comments for moderation
 * Limited to 5 most recent
 */
export const useRecentComments = () => {
  return useQuery({
    queryKey: queryKeys.comments.list({
      status: CommentStatus.PENDING,
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }),
    queryFn: async () => {
      const { data } = await axiosInstance.get<PaginatedResponse<Comment>>('/comments', {
        params: {
          status: CommentStatus.PENDING,
          limit: 5,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - comments are more dynamic
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Update comment status (approve/reject)
 */
export const useUpdateCommentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      status,
    }: {
      commentId: string;
      status: CommentStatus.APPROVED | CommentStatus.REJECTED;
    }) => {
      const payload: UpdateCommentRequest = { status };
      const { data } = await axiosInstance.patch<Comment>(`/comments/${commentId}`, payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate comments queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
      // Also invalidate dashboard stats as pending count may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard() });
    },
  });
};
