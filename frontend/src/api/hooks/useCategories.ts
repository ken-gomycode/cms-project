import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import {
  Category,
  PaginatedResponse,
  FilterParams,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/types';

/**
 * Get paginated categories list
 */
export const useCategories = (filters: FilterParams = {}) => {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: async (): Promise<PaginatedResponse<Category>> => {
      const response = await axios.get<PaginatedResponse<Category>>('/categories', {
        params: filters,
      });
      return response.data;
    },
  });
};

/**
 * Get category by ID
 */
export const useCategory = (id: string) => {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: async (): Promise<Category> => {
      const response = await axios.get<Category>(`/categories/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Create category mutation
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryRequest): Promise<Category> => {
      const response = await axios.post<Category>('/categories', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
    },
  });
};

/**
 * Update category mutation
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCategoryRequest;
    }): Promise<Category> => {
      const response = await axios.patch<Category>(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.detail(variables.id),
      });
    },
  });
};

/**
 * Delete category mutation
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
    },
  });
};
