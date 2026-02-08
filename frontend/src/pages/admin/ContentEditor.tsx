import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import {
  useContent,
  useCreateContent,
  useUpdateContent,
  useCategories,
  useTags,
} from '@/api/hooks';
import { Button, Input, Textarea, Select, Spinner, Checkbox } from '@/components/ui';
import { ContentStatus } from '@/types';
import { toast } from '@/stores/toastStore';

/**
 * Content form validation schema
 */
const contentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string().min(10, 'Body must be at least 10 characters'),
  status: z.nativeEnum(ContentStatus),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
  seoMetadata: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
    })
    .optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

/**
 * ContentEditor Page - Create and edit content
 * Handles both creation and editing modes based on route params
 */
export const ContentEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  // State
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEditMode);

  // Data fetching
  const { data: content, isLoading: isLoadingContent } = useContent(id || '');
  const { data: categoriesData } = useCategories({ limit: 100 });
  const { data: tagsData } = useTags({ limit: 100 });

  // Mutations
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      status: ContentStatus.DRAFT,
      tagIds: [],
    },
  });

  // Watch title for auto-slug generation
  const title = watch('title');
  const slug = watch('slug');

  // Auto-generate slug from title
  useEffect(() => {
    if (autoSlug && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setValue('slug', generatedSlug);
    }
  }, [title, autoSlug, setValue]);

  // Load content data in edit mode
  useEffect(() => {
    if (content && isEditMode) {
      reset({
        title: content.title,
        slug: content.slug,
        excerpt: content.excerpt || '',
        body: content.body,
        status: content.status,
        publishedAt: content.publishedAt
          ? new Date(content.publishedAt).toISOString().slice(0, 16)
          : '',
        scheduledAt: content.scheduledAt
          ? new Date(content.scheduledAt).toISOString().slice(0, 16)
          : '',
        categoryId: content.categoryId || '',
        tagIds: content.tags?.map((tag) => tag.id) || [],
        featuredImage: content.featuredImage || '',
        seoMetadata: {
          metaTitle: content.seoMetadata?.metaTitle || '',
          metaDescription: content.seoMetadata?.metaDescription || '',
          ogTitle: content.seoMetadata?.ogTitle || '',
          ogDescription: content.seoMetadata?.ogDescription || '',
        },
      });
      setAutoSlug(false);
    }
  }, [content, isEditMode, reset]);

  // Form submission
  const onSubmit = async (data: ContentFormData) => {
    try {
      // Clean up empty fields
      const payload = {
        ...data,
        excerpt: data.excerpt || undefined,
        categoryId: data.categoryId || undefined,
        featuredImage: data.featuredImage || undefined,
        publishedAt: data.publishedAt || undefined,
        scheduledAt: data.scheduledAt || undefined,
        seoMetadata:
          data.seoMetadata &&
          (data.seoMetadata.metaTitle ||
            data.seoMetadata.metaDescription ||
            data.seoMetadata.ogTitle ||
            data.seoMetadata.ogDescription)
            ? data.seoMetadata
            : undefined,
      };

      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success('Content updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Content created successfully');
      }

      navigate('/admin/content');
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update content' : 'Failed to create content');
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = () => {
    setValue('status', ContentStatus.DRAFT);
    handleSubmit(onSubmit)();
  };

  // Handle publish
  const handlePublish = () => {
    setValue('status', ContentStatus.PUBLISHED);
    if (!watch('publishedAt')) {
      setValue('publishedAt', new Date().toISOString().slice(0, 16));
    }
    handleSubmit(onSubmit)();
  };

  // Loading state
  if (isEditMode && isLoadingContent) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/content')}
          aria-label="Back to content list"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Post' : 'Create New Post'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEditMode ? 'Update your content' : 'Create a new content article'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Input
                {...register('title')}
                label="Title"
                placeholder="Enter post title..."
                error={errors.title?.message}
                isRequired
                className="text-2xl font-semibold"
              />
            </div>

            {/* Slug */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Slug
                </label>
                <button
                  type="button"
                  onClick={() => setAutoSlug(!autoSlug)}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  {autoSlug ? '(Auto)' : '(Manual)'}
                </button>
              </div>
              <Input
                {...register('slug')}
                placeholder="post-slug-url"
                error={errors.slug?.message}
                disabled={autoSlug}
              />
              <p className="text-xs text-gray-500 mt-2">URL: /content/{slug || 'post-slug-url'}</p>
            </div>

            {/* Body */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Textarea
                {...register('body')}
                label="Content Body"
                placeholder="Write your content here..."
                rows={15}
                error={errors.body?.message}
                isRequired
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Rich text editor will be added in a future update. For now, you can use Markdown or
                HTML.
              </p>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Textarea
                {...register('excerpt')}
                label="Excerpt"
                placeholder="Brief summary of the post..."
                rows={3}
                error={errors.excerpt?.message}
                helpText="Optional. Displayed in post listings."
              />
            </div>

            {/* SEO Metadata */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => setSeoExpanded(!seoExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  SEO Metadata
                </span>
                {seoExpanded ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </button>

              {seoExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-200 pt-4">
                  <Input
                    {...register('seoMetadata.metaTitle')}
                    label="Meta Title"
                    placeholder="SEO title for search engines"
                  />
                  <Textarea
                    {...register('seoMetadata.metaDescription')}
                    label="Meta Description"
                    placeholder="SEO description for search engines"
                    rows={2}
                  />
                  <Input
                    {...register('seoMetadata.ogTitle')}
                    label="Open Graph Title"
                    placeholder="Title for social media sharing"
                  />
                  <Textarea
                    {...register('seoMetadata.ogDescription')}
                    label="Open Graph Description"
                    placeholder="Description for social media sharing"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Publish Settings
              </h3>

              <Select
                {...register('status')}
                label="Status"
                error={errors.status?.message}
                isRequired
              >
                <option value={ContentStatus.DRAFT}>Draft</option>
                <option value={ContentStatus.PUBLISHED}>Published</option>
                <option value={ContentStatus.SCHEDULED}>Scheduled</option>
                <option value={ContentStatus.ARCHIVED}>Archived</option>
              </Select>

              <Input
                {...register('publishedAt')}
                type="datetime-local"
                label="Publish Date"
                helpText="Leave empty to publish immediately"
              />

              <Input
                {...register('scheduledAt')}
                type="datetime-local"
                label="Schedule Date"
                helpText="Schedule content for future publishing"
              />
            </div>

            {/* Category */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Category
              </h3>
              <Select {...register('categoryId')} label="Select Category">
                <option value="">None</option>
                {categoriesData?.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Tags
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tagsData?.data.map((tag) => (
                  <Controller
                    key={tag.id}
                    name="tagIds"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <Checkbox
                          checked={field.value?.includes(tag.id) || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const currentTags = field.value || [];
                            if (checked) {
                              field.onChange([...currentTags, tag.id]);
                            } else {
                              field.onChange(currentTags.filter((id) => id !== tag.id));
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{tag.name}</span>
                      </label>
                    )}
                  />
                ))}
                {(!tagsData?.data || tagsData.data.length === 0) && (
                  <p className="text-sm text-gray-500">No tags available</p>
                )}
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Featured Image
              </h3>
              <Input
                {...register('featuredImage')}
                label="Image URL"
                placeholder="https://example.com/image.jpg"
                helpText="Media picker will be added in Phase 22"
              />
              {watch('featuredImage') && (
                <div className="mt-4">
                  <img
                    src={watch('featuredImage')}
                    alt="Featured preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg rounded-t-lg p-4 mt-6">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/admin/content')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              {!isEditMode && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveAsDraft}
                  isLoading={isSubmitting && watch('status') === ContentStatus.DRAFT}
                  disabled={isSubmitting}
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={isEditMode ? handleSubmit(onSubmit) : handlePublish}
                isLoading={
                  isSubmitting && (isEditMode || watch('status') === ContentStatus.PUBLISHED)
                }
                disabled={isSubmitting}
              >
                {isEditMode ? 'Update' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
