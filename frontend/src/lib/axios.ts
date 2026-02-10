import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { RefreshTokenResponse } from '@/types';

// API base URL from environment
const API_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request queue for handling token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Clear auth data from localStorage and update Zustand store.
 * Does NOT do a hard redirect — lets React auth guards handle navigation.
 */
const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  // Dynamically import to avoid circular dependency, then call logout
  // This updates Zustand state so AuthGuard re-renders and redirects
  import('@/stores/authStore').then(({ useAuthStore }) => {
    useAuthStore.getState().logout();
  });
};

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });

  failedQueue = [];
};

/**
 * Request interceptor: Attach JWT to all requests
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor: Unwrap backend envelope + handle 401 errors and token refresh
 *
 * The backend wraps all responses in { data, statusCode, timestamp }.
 * This interceptor unwraps it so `response.data` gives the actual payload.
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Unwrap the backend's { data, statusCode, timestamp } envelope
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'statusCode' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't attempt token refresh for auth endpoints (login, register)
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    // If token refresh endpoint fails, clear auth and let guards redirect
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuth();
      return Promise.reject(error);
    }

    // If already refreshing, queue the request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      clearAuth();
      return Promise.reject(error);
    }

    try {
      // Call refresh endpoint
      const response = await axios.post<RefreshTokenResponse>(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      // Update tokens in localStorage
      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Process queued requests
      processQueue();

      // Retry original request with new token
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Refresh failed, clear auth and let guards redirect
      processQueue(refreshError as Error);
      clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
