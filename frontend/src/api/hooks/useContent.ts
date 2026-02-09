import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import {
  Content,
  ContentWithRelations,
  PaginatedResponse,
  ContentFilterParams,
  CreateContentRequest,
  UpdateContentRequest,
  ContentVersion,
} from '@/types';

/**
 * Get paginated content list
 * Returns ContentWithRelations which includes nested categories and tags
 */
export const useContents = (filters: ContentFilterParams = {}) => {
  return useQuery({
    queryKey: queryKeys.content.list(filters),
    queryFn: async (): Promise<PaginatedResponse<ContentWithRelations>> => {
      const response = await axios.get<PaginatedResponse<ContentWithRelations>>('/content', {
        params: filters,
      });
      return response.data;
    },
  });
};

/**
 * Get content by ID
 * Returns ContentWithRelations which includes nested categories and tags
 */
export const useContent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.content.detail(id),
    queryFn: async (): Promise<ContentWithRelations> => {
      const response = await axios.get<ContentWithRelations>(`/content/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Get content by slug (for public pages)
 * Returns ContentWithRelations which includes nested categories and tags
 */
export const useContentBySlug = (slug: string) => {
  return useQuery({
    queryKey: queryKeys.content.bySlug(slug),
    queryFn: async (): Promise<ContentWithRelations> => {
      const response = await axios.get<ContentWithRelations>(`/content/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
};

/**
 * Get content versions
 */
export const useContentVersions = (id: string) => {
  return useQuery({
    queryKey: queryKeys.content.versions(id),
    queryFn: async (): Promise<ContentVersion[]> => {
      const response = await axios.get<ContentVersion[]>(`/content/${id}/versions`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Create content mutation
 */
export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContentRequest): Promise<Content> => {
      const response = await axios.post<Content>('/content', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.lists() });
    },
  });
};

/**
 * Update content mutation
 */
export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateContentRequest;
    }): Promise<Content> => {
      const response = await axios.patch<Content>(`/content/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.versions(variables.id),
      });
    },
  });
};

/**
 * Delete content mutation
 */
export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.lists() });
    },
  });
};

/**
 * Publish content mutation
 */
export const usePublishContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Content> => {
      const response = await axios.post<Content>(`/content/${id}/publish`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.detail(data.id),
      });
    },
  });
};
