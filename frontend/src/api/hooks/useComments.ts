import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import {
  Comment,
  PaginatedResponse,
  CommentFilterParams,
  ModerateCommentRequest,
  BatchModerateCommentsRequest,
} from '@/types';

/**
 * Get paginated comments list
 */
export const useComments = (filters: CommentFilterParams = {}) => {
  return useQuery({
    queryKey: queryKeys.comments.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      const response = await axios.get<PaginatedResponse<Comment>>('/comments', {
        params: filters,
      });
      return response.data;
    },
  });
};

/**
 * Get pending comments
 */
export const usePendingComments = () => {
  return useQuery({
    queryKey: queryKeys.comments.list({ status: 'PENDING' as any }),
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      const response = await axios.get<PaginatedResponse<Comment>>('/comments/pending');
      return response.data;
    },
  });
};

/**
 * Get comments for specific content
 */
export const useContentComments = (contentId: string) => {
  return useQuery({
    queryKey: queryKeys.comments.list({ contentId }),
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      const response = await axios.get<PaginatedResponse<Comment>>(
        `/comments/content/${contentId}`,
      );
      return response.data;
    },
    enabled: !!contentId,
  });
};

/**
 * Get comment by ID
 */
export const useComment = (id: string) => {
  return useQuery({
    queryKey: queryKeys.comments.detail(id),
    queryFn: async (): Promise<Comment> => {
      const response = await axios.get<Comment>(`/comments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Moderate single comment mutation
 */
export const useModerateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ModerateCommentRequest;
    }): Promise<Comment> => {
      const response = await axios.patch<Comment>(`/comments/${id}/moderate`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(variables.id),
      });
    },
  });
};

/**
 * Batch moderate comments mutation
 */
export const useBatchModerateComments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BatchModerateCommentsRequest): Promise<{ count: number }> => {
      const response = await axios.patch<{ count: number }>('/comments/batch-moderate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.lists() });
    },
  });
};

/**
 * Delete comment mutation
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.lists() });
    },
  });
};
