/**
 * Analytics-specific React Query hooks
 *
 * Provides hooks for:
 * - Per-content analytics with daily breakdown
 */

import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/api/queryKeys';

/**
 * Content analytics response from the backend
 */
interface ContentAnalyticsResponse {
  contentId: string;
  period: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  totals: {
    views: number;
    uniqueVisitors: number;
  };
  dailyStats: Array<{
    date: Date;
    views: number;
    uniqueVisitors: number;
  }>;
}

/**
 * Fetch detailed analytics for a specific content
 * Requires EDITOR or ADMIN role
 *
 * @param contentId Content ID to fetch analytics for
 * @param days Number of days to look back (default: 30)
 */
export const useContentAnalytics = (contentId: string | null, days: number = 30) => {
  return useQuery({
    queryKey: [...queryKeys.analytics.all, 'content-detail', contentId, days],
    queryFn: async () => {
      if (!contentId) {
        return null;
      }

      const { data } = await axiosInstance.get<ContentAnalyticsResponse>(
        `/analytics/content/${contentId}`,
        {
          params: { days },
        },
      );
      return data;
    },
    enabled: !!contentId, // Only fetch if contentId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
};
