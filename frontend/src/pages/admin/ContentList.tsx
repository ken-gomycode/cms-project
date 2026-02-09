import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useContents, useDeleteContent } from '@/api/hooks';
import { Button, Badge, ConfirmDialog } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ContentWithRelations, ContentStatus } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDate } from '@/lib/dateUtils';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * ContentList Page - Content management page
 * Displays a list of all content with filtering, sorting, and actions
 */
export const ContentList = () => {
  const navigate = useNavigate();

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Selection and deletion states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<string | null>(null);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, 300);

  // Build filter params
  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      sortBy,
      sortOrder,
    }),
    [page, debouncedSearch, statusFilter, sortBy, sortOrder],
  );

  // Data fetching
  const { data, isLoading, error } = useContents(filters);
  const deleteContentMutation = useDeleteContent();

  // Table columns configuration
  const columns: Column<ContentWithRelations>[] = [
    {
      header: 'Title',
      accessor: 'title',
      sortable: true,
      cell: (value: string, row: ContentWithRelations) => (
        <div className="max-w-md">
          <div className="font-medium text-gray-900 truncate">{value}</div>
          {row.excerpt && (
            <div className="text-sm text-gray-500 truncate mt-0.5">{row.excerpt}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Author',
      accessor: (row) => row.author,
      cell: (author: ContentWithRelations['author']) => (
        <span className="text-sm text-gray-700">
          {author ? `${author.firstName} ${author.lastName}` : 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (status: ContentStatus) => <Badge status={status} />,
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
      cell: (id: string) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/content/${id}/edit`);
            }}
            aria-label="Edit content"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(id);
            }}
            aria-label="Delete content"
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleDeleteClick = (id: string) => {
    setContentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;

    try {
      await deleteContentMutation.mutateAsync(contentToDelete);
      toast.success('Content deleted successfully');
      setDeleteDialogOpen(false);
      setContentToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== contentToDelete));
    } catch (error) {
      toast.error('Failed to delete content');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteContentMutation.mutateAsync(id)));
      toast.success(`${selectedIds.length} content items deleted successfully`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete some content items');
    }
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ContentStatus | '');
    setPage(1);
  };

  const handleSortSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'newest') {
      setSortBy('createdAt');
      setSortOrder('desc');
    } else if (value === 'oldest') {
      setSortBy('createdAt');
      setSortOrder('asc');
    } else if (value === 'title-asc') {
      setSortBy('title');
      setSortOrder('asc');
    } else if (value === 'title-desc') {
      setSortBy('title');
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-sm text-gray-600 mt-1">Create and manage your content articles</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/admin/content/new')} className="gap-2">
          <Plus size={20} />
          New Post
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div>
            <label
              htmlFor="search"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Search
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status-filter"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">All Statuses</option>
              <option value={ContentStatus.DRAFT}>Draft</option>
              <option value={ContentStatus.PUBLISHED}>Published</option>
              <option value={ContentStatus.ARCHIVED}>Archived</option>
              <option value={ContentStatus.SCHEDULED}>Scheduled</option>
            </select>
          </div>

          {/* Sort Select */}
          <div>
            <label
              htmlFor="sort"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Sort By
            </label>
            <select
              id="sort"
              value={
                sortBy === 'createdAt' && sortOrder === 'desc'
                  ? 'newest'
                  : sortBy === 'createdAt' && sortOrder === 'asc'
                    ? 'oldest'
                    : sortBy === 'title' && sortOrder === 'asc'
                      ? 'title-asc'
                      : 'title-desc'
              }
              onChange={handleSortSelectChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              isLoading={deleteContentMutation.isPending}
            >
              <Trash2 size={16} />
              Delete Selected
            </Button>
          </div>
        )}
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
          emptyMessage="No content found. Create your first post to get started."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          pagination={
            data
              ? {
                  page: data.meta.page,
                  totalPages: data.meta.totalPages,
                  onPageChange: setPage,
                }
              : undefined
          }
          sorting={{
            column: sortBy,
            order: sortOrder,
            onSortChange: handleSortChange,
          }}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setContentToDelete(null);
        }}
        variant="danger"
        title="Delete Content"
        message="Are you sure you want to delete this content? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteContentMutation.isPending}
      />
    </div>
  );
};
