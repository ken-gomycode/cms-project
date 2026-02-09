import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/api/hooks';
import { Button, Modal, ConfirmDialog, Input } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Tag, CreateTagRequest, UpdateTagRequest } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * Tag form validation schema
 */
const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
});

type TagFormData = z.infer<typeof tagSchema>;

/**
 * Generate slug from name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Tags Page - Tag management page
 * Displays a list of all tags with CRUD operations
 */
export const Tags = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Build filter params
  const filters = useMemo(
    () => ({
      sortBy,
      sortOrder,
    }),
    [sortBy, sortOrder],
  );

  // Data fetching
  const { data, isLoading, error } = useTags(filters);
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  // Form setup for create
  const createForm = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  // Form setup for edit
  const editForm = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  // Auto-generate slug from name
  const nameValue = createForm.watch('name');
  useEffect(() => {
    if (nameValue && !createForm.formState.dirtyFields.slug) {
      createForm.setValue('slug', generateSlug(nameValue));
    }
  }, [nameValue, createForm]);

  const editNameValue = editForm.watch('name');
  useEffect(() => {
    if (editNameValue && !editForm.formState.dirtyFields.slug) {
      editForm.setValue('slug', generateSlug(editNameValue));
    }
  }, [editNameValue, editForm]);

  // Table columns configuration
  const columns: Column<Tag>[] = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
      cell: (value: string, row: Tag) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{row.slug}</div>
        </div>
      ),
    },
    {
      header: 'Content Count',
      accessor: (row) => row._count?.contents || 0,
      sortable: true,
      cell: (count: number) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {count}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      cell: (date: string) => <span className="text-sm text-gray-600">{formatDate(date)}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => row.id,
      width: 'w-32',
      cell: (_id: string, row: Tag) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            aria-label="Edit tag"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row);
            }}
            aria-label="Delete tag"
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag);
    editForm.reset({
      name: tag.name,
      slug: tag.slug,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async (formData: TagFormData) => {
    try {
      const payload: CreateTagRequest = {
        name: formData.name,
        slug: formData.slug || undefined,
      };

      await createTagMutation.mutateAsync(payload);
      toast.success('Tag created successfully');
      setIsCreateModalOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create tag');
    }
  };

  const handleEditSubmit = async (formData: TagFormData) => {
    if (!editingTag) return;

    try {
      const payload: UpdateTagRequest = {
        name: formData.name,
        slug: formData.slug || undefined,
      };

      await updateTagMutation.mutateAsync({
        id: editingTag.id,
        data: payload,
      });
      toast.success('Tag updated successfully');
      setIsEditModalOpen(false);
      setEditingTag(null);
      editForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tag');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tagToDelete) return;

    try {
      await deleteTagMutation.mutateAsync(tagToDelete.id);
      toast.success('Tag deleted successfully');
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
    }
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-sm text-gray-600 mt-1">
            Organize your content with simple, flexible tags
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={20} />
          New Tag
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load tags. Please try again.
        </div>
      )}

      {/* Tags Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No tags yet. Create your first tag to get started."
          sorting={{
            column: sortBy,
            order: sortOrder,
            onSortChange: handleSortChange,
          }}
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          createForm.reset();
        }}
        title="Create Tag"
        description="Add a new tag to organize your content"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
          {/* Name Input */}
          <div>
            <label
              htmlFor="create-name"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Name *
            </label>
            <Input
              id="create-name"
              {...createForm.register('name')}
              placeholder="Enter tag name"
              error={createForm.formState.errors.name?.message}
            />
          </div>

          {/* Slug Input */}
          <div>
            <label
              htmlFor="create-slug"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Slug
            </label>
            <Input
              id="create-slug"
              {...createForm.register('slug')}
              placeholder="auto-generated-slug"
              error={createForm.formState.errors.slug?.message}
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated from name. Use lowercase, numbers, and hyphens only.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                createForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createTagMutation.isPending}>
              Create Tag
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTag(null);
          editForm.reset();
        }}
        title="Edit Tag"
        description="Update tag information"
        size="lg"
      >
        <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
          {/* Name Input */}
          <div>
            <label
              htmlFor="edit-name"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Name *
            </label>
            <Input
              id="edit-name"
              {...editForm.register('name')}
              placeholder="Enter tag name"
              error={editForm.formState.errors.name?.message}
            />
          </div>

          {/* Slug Input */}
          <div>
            <label
              htmlFor="edit-slug"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Slug
            </label>
            <Input
              id="edit-slug"
              {...editForm.register('slug')}
              placeholder="auto-generated-slug"
              error={editForm.formState.errors.slug?.message}
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated from name. Use lowercase, numbers, and hyphens only.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTag(null);
                editForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateTagMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTagToDelete(null);
        }}
        variant="danger"
        title="Delete Tag"
        message={
          tagToDelete
            ? `Are you sure you want to delete "${tagToDelete.name}"? This action cannot be undone. ${tagToDelete._count?.contents ? `This tag has ${tagToDelete._count.contents} associated content items.` : ''}`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteTagMutation.isPending}
      />
    </div>
  );
};
