import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useContents,
  useUpdateSeo,
  useDeleteSeo,
  useAnalyzeSeo,
  UpdateSeoRequest,
  SeoAnalysisResult,
} from '@/api/hooks';
import { Button, Modal, ConfirmDialog, Input, Textarea } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Content, ContentStatus } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * SEO form validation schema
 */
const seoSchema = z.object({
  metaTitle: z
    .string()
    .max(60, 'Meta title should not exceed 60 characters')
    .optional()
    .or(z.literal('')),
  metaDescription: z
    .string()
    .max(160, 'Meta description should not exceed 160 characters')
    .optional()
    .or(z.literal('')),
  canonicalUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  ogTitle: z
    .string()
    .max(60, 'OG title should not exceed 60 characters')
    .optional()
    .or(z.literal('')),
  ogDescription: z
    .string()
    .max(160, 'OG description should not exceed 160 characters')
    .optional()
    .or(z.literal('')),
  ogImage: z.string().url('Invalid URL').optional().or(z.literal('')),
  robots: z.string().optional().or(z.literal('')),
});

type SeoFormData = z.infer<typeof seoSchema>;

/**
 * SEO Management Page - Manage SEO metadata for all content
 * Allows editing SEO metadata and analyzing SEO quality
 */
export const SeoManagement = () => {
  // State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seoToDelete, setSeoToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [analysisResult, setAnalysisResult] = useState<SeoAnalysisResult | null>(null);

  // Build filter params - only show published content
  const filters = useMemo(
    () => ({
      status: ContentStatus.PUBLISHED,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
    }),
    [searchQuery, sortBy, sortOrder],
  );

  // Data fetching
  const { data, isLoading, error } = useContents(filters);
  const updateSeoMutation = useUpdateSeo();
  const deleteSeoMutation = useDeleteSeo();
  const analyzeSeoMutation = useAnalyzeSeo();

  // Form setup
  const form = useForm<SeoFormData>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      metaTitle: '',
      metaDescription: '',
      canonicalUrl: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      robots: '',
    },
  });

  // Watch character counts
  const metaTitleValue = form.watch('metaTitle') || '';
  const metaDescriptionValue = form.watch('metaDescription') || '';
  const ogTitleValue = form.watch('ogTitle') || '';
  const ogDescriptionValue = form.watch('ogDescription') || '';

  // Table columns configuration
  const columns: Column<Content>[] = [
    {
      header: 'Title',
      accessor: 'title',
      sortable: true,
      cell: (value: string, row: Content) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{row.slug}</div>
        </div>
      ),
    },
    {
      header: 'SEO Status',
      accessor: (row) => !!row.seoMetadata,
      cell: (hasSeo: boolean) => (
        <div>
          {hasSeo ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-success-700 bg-success-50 border-success-200">
              <CheckCircle2 size={12} />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-warning-700 bg-warning-50 border-warning-200">
              <AlertCircle size={12} />
              Not Set
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Meta Title',
      accessor: (row) => row.seoMetadata?.metaTitle,
      cell: (metaTitle: string | null | undefined) => (
        <span className="text-sm text-gray-700 line-clamp-1">
          {metaTitle || <span className="text-gray-400 italic">Not set</span>}
        </span>
      ),
    },
    {
      header: 'Published',
      accessor: 'publishedAt',
      sortable: true,
      cell: (date: string | null) =>
        date ? (
          <span className="text-sm text-gray-600">{formatDate(date)}</span>
        ) : (
          <span className="text-gray-400 italic text-sm">Not published</span>
        ),
    },
    {
      header: 'Actions',
      accessor: (row) => row.id,
      width: 'w-32',
      cell: (_id: string, row: Content) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            aria-label="Edit SEO metadata"
          >
            <Edit size={16} />
          </Button>
          {row.seoMetadata && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(row.id);
              }}
              aria-label="Delete SEO metadata"
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Handlers
  const handleEditClick = (content: Content) => {
    setSelectedContent(content);
    setAnalysisResult(null);

    // Pre-fill form with existing SEO metadata if available
    if (content.seoMetadata) {
      form.reset({
        metaTitle: content.seoMetadata.metaTitle || '',
        metaDescription: content.seoMetadata.metaDescription || '',
        canonicalUrl: content.seoMetadata.canonicalUrl || '',
        ogTitle: content.seoMetadata.ogTitle || '',
        ogDescription: content.seoMetadata.ogDescription || '',
        ogImage: content.seoMetadata.ogImage || '',
        robots: content.seoMetadata.robots || '',
      });
    } else {
      // Auto-populate with content data
      form.reset({
        metaTitle: content.title,
        metaDescription: content.excerpt || '',
        canonicalUrl: '',
        ogTitle: content.title,
        ogDescription: content.excerpt || '',
        ogImage: content.featuredImage || '',
        robots: 'index, follow',
      });
    }

    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (contentId: string) => {
    setSeoToDelete(contentId);
    setDeleteDialogOpen(true);
  };

  const handleSaveSubmit = async (formData: SeoFormData) => {
    if (!selectedContent) return;

    try {
      const payload: UpdateSeoRequest = {
        metaTitle: formData.metaTitle || undefined,
        metaDescription: formData.metaDescription || undefined,
        canonicalUrl: formData.canonicalUrl || undefined,
        ogTitle: formData.ogTitle || undefined,
        ogDescription: formData.ogDescription || undefined,
        ogImage: formData.ogImage || undefined,
        robots: formData.robots || undefined,
      };

      await updateSeoMutation.mutateAsync({
        contentId: selectedContent.id,
        data: payload,
      });

      toast.success('SEO metadata saved successfully');
      setIsEditModalOpen(false);
      setSelectedContent(null);
      setAnalysisResult(null);
      form.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save SEO metadata');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!seoToDelete) return;

    try {
      await deleteSeoMutation.mutateAsync(seoToDelete);
      toast.success('SEO metadata deleted successfully');
      setDeleteDialogOpen(false);
      setSeoToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete SEO metadata');
    }
  };

  const handleAnalyzeSeo = async () => {
    if (!selectedContent) return;

    try {
      const result = await analyzeSeoMutation.mutateAsync(selectedContent.id);
      setAnalysisResult(result);
      toast.success('SEO analysis completed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to analyze SEO');
    }
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  // Get score background
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success-100';
    if (score >= 60) return 'bg-warning-100';
    return 'bg-error-100';
  };

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Optimize search engine visibility for your published content
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load content. Please try again.
        </div>
      )}

      {/* Content Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No published content found. Publish some content first."
          sorting={{
            column: sortBy,
            order: sortOrder,
            onSortChange: handleSortChange,
          }}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedContent(null);
          setAnalysisResult(null);
          form.reset();
        }}
        title={`SEO Metadata - ${selectedContent?.title || ''}`}
        description="Configure SEO metadata for this content"
        size="xl"
      >
        <form onSubmit={form.handleSubmit(handleSaveSubmit)} className="space-y-6">
          {/* SEO Analysis Section */}
          {analysisResult && (
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  SEO Analysis
                </h3>
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreBg(analysisResult.score)}`}
                >
                  <span className={`text-2xl font-bold ${getScoreColor(analysisResult.score)}`}>
                    {analysisResult.score}
                  </span>
                  <span className="text-sm text-gray-600">/ 100</span>
                </div>
              </div>
              <div className="space-y-2">
                {analysisResult.checks.map((check, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {check.passed ? (
                      <CheckCircle2 size={16} className="text-success-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-error-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{check.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{check.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Title */}
          <div>
            <label
              htmlFor="meta-title"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Meta Title
            </label>
            <Input
              id="meta-title"
              {...form.register('metaTitle')}
              placeholder="Enter meta title for search engines"
              error={form.formState.errors.metaTitle?.message}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">Recommended: 50-60 characters</p>
              <p
                className={`text-xs font-medium ${metaTitleValue.length > 60 ? 'text-error-600' : 'text-gray-600'}`}
              >
                {metaTitleValue.length} / 60
              </p>
            </div>
          </div>

          {/* Meta Description */}
          <div>
            <label
              htmlFor="meta-description"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Meta Description
            </label>
            <Textarea
              id="meta-description"
              {...form.register('metaDescription')}
              placeholder="Enter meta description for search engines"
              rows={3}
              error={form.formState.errors.metaDescription?.message}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">Recommended: 150-160 characters</p>
              <p
                className={`text-xs font-medium ${metaDescriptionValue.length > 160 ? 'text-error-600' : 'text-gray-600'}`}
              >
                {metaDescriptionValue.length} / 160
              </p>
            </div>
          </div>

          {/* Canonical URL */}
          <div>
            <label
              htmlFor="canonical-url"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Canonical URL
            </label>
            <Input
              id="canonical-url"
              {...form.register('canonicalUrl')}
              placeholder="https://example.com/canonical-url"
              error={form.formState.errors.canonicalUrl?.message}
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify the preferred URL for this content to avoid duplicate content issues
            </p>
          </div>

          {/* Open Graph Section */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Open Graph (Social Media)
            </h3>

            {/* OG Title */}
            <div className="mb-4">
              <label
                htmlFor="og-title"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
              >
                OG Title
              </label>
              <Input
                id="og-title"
                {...form.register('ogTitle')}
                placeholder="Title for social media sharing"
                error={form.formState.errors.ogTitle?.message}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Recommended: 50-60 characters</p>
                <p
                  className={`text-xs font-medium ${ogTitleValue.length > 60 ? 'text-error-600' : 'text-gray-600'}`}
                >
                  {ogTitleValue.length} / 60
                </p>
              </div>
            </div>

            {/* OG Description */}
            <div className="mb-4">
              <label
                htmlFor="og-description"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
              >
                OG Description
              </label>
              <Textarea
                id="og-description"
                {...form.register('ogDescription')}
                placeholder="Description for social media sharing"
                rows={2}
                error={form.formState.errors.ogDescription?.message}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">Recommended: 150-160 characters</p>
                <p
                  className={`text-xs font-medium ${ogDescriptionValue.length > 160 ? 'text-error-600' : 'text-gray-600'}`}
                >
                  {ogDescriptionValue.length} / 160
                </p>
              </div>
            </div>

            {/* OG Image */}
            <div>
              <label
                htmlFor="og-image"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
              >
                OG Image URL
              </label>
              <Input
                id="og-image"
                {...form.register('ogImage')}
                placeholder="https://example.com/image.jpg"
                error={form.formState.errors.ogImage?.message}
              />
              <p className="text-xs text-gray-500 mt-1">
                Image displayed when sharing on social media (recommended: 1200x630px)
              </p>
            </div>
          </div>

          {/* Robots Directive */}
          <div className="pt-4 border-t border-gray-200">
            <label
              htmlFor="robots"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Robots Directive
            </label>
            <select
              id="robots"
              {...form.register('robots')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">Default (no directive)</option>
              <option value="index, follow">Index, Follow (recommended)</option>
              <option value="noindex, follow">No Index, Follow</option>
              <option value="index, nofollow">Index, No Follow</option>
              <option value="noindex, nofollow">No Index, No Follow</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls how search engines crawl and index this content
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleAnalyzeSeo}
              isLoading={analyzeSeoMutation.isPending}
            >
              Analyze SEO
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedContent(null);
                  setAnalysisResult(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={updateSeoMutation.isPending}>
                Save SEO Metadata
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSeoToDelete(null);
        }}
        variant="danger"
        title="Delete SEO Metadata"
        message="Are you sure you want to delete this SEO metadata? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteSeoMutation.isPending}
      />
    </div>
  );
};
