import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '@/api/queryKeys';
import type {
  Media,
  MediaFilterParams,
  PaginatedResponse,
  UploadMediaRequest,
  UpdateMediaRequest,
} from '@/types';
import { toast } from '@/stores/toastStore';

/**
 * Fetch paginated media list
 */
export const useMedia = (filters?: MediaFilterParams) => {
  return useQuery({
    queryKey: queryKeys.media.list(filters || {}),
    queryFn: async () => {
      const response = await axios.get<PaginatedResponse<Media>>('/media', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch single media item by ID
 */
export const useMediaItem = (id: string) => {
  return useQuery({
    queryKey: queryKeys.media.detail(id),
    queryFn: async () => {
      const response = await axios.get<Media>(`/media/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Upload media file mutation
 */
export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadMediaRequest) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.alt) formData.append('alt', data.alt);
      if (data.caption) formData.append('caption', data.caption);

      const response = await axios.post<Media>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      toast.success('Media uploaded successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to upload media';
      toast.error(message);
    },
  });
};

/**
 * Update media metadata mutation
 */
export const useUpdateMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMediaRequest }) => {
      const response = await axios.patch<Media>(`/media/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.media.detail(data.id) });
      toast.success('Media updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update media';
      toast.error(message);
    },
  });
};

/**
 * Delete media mutation
 */
export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/media/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.lists() });
      toast.success('Media deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete media';
      toast.error(message);
    },
  });
};
