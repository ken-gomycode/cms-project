import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import { Tag, PaginatedResponse, FilterParams, CreateTagRequest, UpdateTagRequest } from '@/types';

/**
 * Get paginated tags list
 */
export const useTags = (filters: FilterParams = {}) => {
  return useQuery({
    queryKey: queryKeys.tags.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Tag>> => {
      const response = await axios.get<PaginatedResponse<Tag>>('/tags', {
        params: filters,
      });
      return response.data;
    },
  });
};

/**
 * Get tag by ID
 */
export const useTag = (id: string) => {
  return useQuery({
    queryKey: queryKeys.tags.detail(id),
    queryFn: async (): Promise<Tag> => {
      const response = await axios.get<Tag>(`/tags/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Create tag mutation
 */
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest): Promise<Tag> => {
      const response = await axios.post<Tag>('/tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
    },
  });
};

/**
 * Update tag mutation
 */
export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagRequest }): Promise<Tag> => {
      const response = await axios.patch<Tag>(`/tags/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.detail(variables.id),
      });
    },
  });
};

/**
 * Delete tag mutation
 */
export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.lists() });
    },
  });
};
