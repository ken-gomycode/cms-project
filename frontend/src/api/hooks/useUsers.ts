import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import {
  User,
  PaginatedResponse,
  UserFilterParams,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateProfileRequest,
} from '@/types';

/**
 * Get paginated users list
 */
export const useUsers = (filters: UserFilterParams = {}) => {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async (): Promise<PaginatedResponse<User>> => {
      const response = await axios.get<PaginatedResponse<User>>('/users', {
        params: filters,
      });
      return response.data;
    },
  });
};

/**
 * Get user by ID
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async (): Promise<User> => {
      const response = await axios.get<User>(`/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Create user mutation
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest): Promise<User> => {
      const response = await axios.post<User>('/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};

/**
 * Update user mutation
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRequest }): Promise<User> => {
      const response = await axios.patch<User>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.id),
      });
    },
  });
};

/**
 * Delete user mutation
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
};

/**
 * Get current user's profile
 */
export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: async (): Promise<User> => {
      const response = await axios.get<User>('/users/profile');
      return response.data;
    },
  });
};

/**
 * Update current user's profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest): Promise<User> => {
      const response = await axios.patch<User>('/users/profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
    },
  });
};
