import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { queryKeys } from '../queryKeys';
import { SeoMetadata } from '@/types';

/**
 * Request payload for creating/updating SEO metadata
 * Matches backend CreateSeoDto exactly
 */
export interface UpdateSeoRequest {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
  structuredData?: any;
}

/**
 * Individual SEO check result
 */
export interface SeoCheck {
  name: string;
  passed: boolean;
  message: string;
}

/**
 * SEO analysis response
 */
export interface SeoAnalysisResult {
  score: number;
  checks: SeoCheck[];
}

/**
 * Get SEO metadata for a specific content item
 */
export const useSeoMetadata = (contentId: string) => {
  return useQuery({
    queryKey: queryKeys.seo.detail(contentId),
    queryFn: async (): Promise<SeoMetadata> => {
      const response = await axios.get<SeoMetadata>(`/content/${contentId}/seo`);
      return response.data;
    },
    enabled: !!contentId,
    retry: false, // Don't retry if SEO metadata doesn't exist (404)
  });
};

/**
 * Create or update SEO metadata for content
 */
export const useUpdateSeo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      data,
    }: {
      contentId: string;
      data: UpdateSeoRequest;
    }): Promise<SeoMetadata> => {
      const response = await axios.put<SeoMetadata>(`/content/${contentId}/seo`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the SEO metadata for this content
      queryClient.invalidateQueries({
        queryKey: queryKeys.seo.detail(variables.contentId),
      });
      // Also invalidate content detail to update the content with new SEO data
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.detail(variables.contentId),
      });
    },
  });
};

/**
 * Delete SEO metadata for content
 */
export const useDeleteSeo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string): Promise<{ message: string }> => {
      const response = await axios.delete<{ message: string }>(`/content/${contentId}/seo`);
      return response.data;
    },
    onSuccess: (_, contentId) => {
      // Invalidate the SEO metadata for this content
      queryClient.invalidateQueries({
        queryKey: queryKeys.seo.detail(contentId),
      });
      // Also invalidate content detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.content.detail(contentId),
      });
    },
  });
};

/**
 * Analyze SEO quality for content
 * Returns SEO score and detailed check results
 */
export const useAnalyzeSeo = () => {
  return useMutation({
    mutationFn: async (contentId: string): Promise<SeoAnalysisResult> => {
      const response = await axios.post<SeoAnalysisResult>(`/content/${contentId}/seo/analyze`);
      return response.data;
    },
  });
};
