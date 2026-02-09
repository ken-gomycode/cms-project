import { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/api/hooks';
import { Button, Modal, ConfirmDialog, Input, Textarea } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * Category form validation schema
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  description: z.string().max(500, 'Description too long').optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
});

type CategoryFormData = z.infer<typeof categorySchema>;

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
 * Categories Page - Category management page
 * Displays a list of all categories with CRUD operations
 */
export const Categories = () => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

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
  const { data, isLoading, error } = useCategories(filters);
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // Form setup for create
  const createForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      parentId: '',
    },
  });

  // Form setup for edit
  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      parentId: '',
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

  // Get parent category name
  const getParentName = (category: Category): string | null => {
    if (!category.parentId) return null;
    const parent = data?.data.find((c) => c.id === category.parentId);
    return parent?.name || null;
  };

  // Table columns configuration
  const columns: Column<Category>[] = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
      cell: (value: string, row: Category) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{row.slug}</div>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      cell: (description: string | null) => (
        <span className="text-sm text-gray-700 line-clamp-2">
          {description || <span className="text-gray-400 italic">No description</span>}
        </span>
      ),
    },
    {
      header: 'Parent',
      accessor: (row) => getParentName(row),
      cell: (parentName: string | null) => (
        <span className="text-sm text-gray-700">
          {parentName || <span className="text-gray-400 italic">None</span>}
        </span>
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
      cell: (_id: string, row: Category) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditClick(row);
            }}
            aria-label="Edit category"
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
            aria-label="Delete category"
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    editForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parentId: category.parentId || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = async (formData: CategoryFormData) => {
    try {
      const payload: CreateCategoryRequest = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      };

      await createCategoryMutation.mutateAsync(payload);
      toast.success('Category created successfully');
      setIsCreateModalOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleEditSubmit = async (formData: CategoryFormData) => {
    if (!editingCategory) return;

    try {
      const payload: UpdateCategoryRequest = {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        parentId: formData.parentId || undefined,
      };

      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        data: payload,
      });
      toast.success('Category updated successfully');
      setIsEditModalOpen(false);
      setEditingCategory(null);
      editForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
      toast.success('Category deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  // Get available parent categories (exclude self when editing)
  const availableParentCategories = useMemo(() => {
    if (!data?.data) return [];
    if (editingCategory) {
      return data.data.filter((c) => c.id !== editingCategory.id);
    }
    return data.data;
  }, [data?.data, editingCategory]);

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-600 mt-1">
            Organize your content with hierarchical categories
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus size={20} />
          New Category
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load categories. Please try again.
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No categories yet. Create your first category to get started."
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
        title="Create Category"
        description="Add a new category to organize your content"
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
              placeholder="Enter category name"
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

          {/* Description Input */}
          <div>
            <label
              htmlFor="create-description"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Description
            </label>
            <Textarea
              id="create-description"
              {...createForm.register('description')}
              placeholder="Enter category description (optional)"
              rows={3}
              error={createForm.formState.errors.description?.message}
            />
          </div>

          {/* Parent Category Select */}
          <div>
            <label
              htmlFor="create-parent"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Parent Category
            </label>
            <select
              id="create-parent"
              {...createForm.register('parentId')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">None (Top Level)</option>
              {availableParentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
            <Button type="submit" variant="primary" isLoading={createCategoryMutation.isPending}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCategory(null);
          editForm.reset();
        }}
        title="Edit Category"
        description="Update category information"
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
              placeholder="Enter category name"
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

          {/* Description Input */}
          <div>
            <label
              htmlFor="edit-description"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Description
            </label>
            <Textarea
              id="edit-description"
              {...editForm.register('description')}
              placeholder="Enter category description (optional)"
              rows={3}
              error={editForm.formState.errors.description?.message}
            />
          </div>

          {/* Parent Category Select */}
          <div>
            <label
              htmlFor="edit-parent"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Parent Category
            </label>
            <select
              id="edit-parent"
              {...editForm.register('parentId')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">None (Top Level)</option>
              {availableParentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCategory(null);
                editForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={updateCategoryMutation.isPending}>
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
          setCategoryToDelete(null);
        }}
        variant="danger"
        title="Delete Category"
        message={
          categoryToDelete
            ? `Are you sure you want to delete "${categoryToDelete.name}"? This action cannot be undone. ${categoryToDelete._count?.contents ? `This category has ${categoryToDelete._count.contents} associated content items.` : ''}`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteCategoryMutation.isPending}
      />
    </div>
  );
};
