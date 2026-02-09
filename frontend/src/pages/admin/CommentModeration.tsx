import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Trash2, Eye } from 'lucide-react';
import {
  useComments,
  useModerateComment,
  useBatchModerateComments,
  useDeleteComment,
} from '@/api/hooks';
import { Button, Modal, ConfirmDialog, Badge } from '@/components/ui';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Comment, CommentStatus } from '@/types';
import { toast } from '@/stores/toastStore';
import { formatDateTime, formatDateLong } from '@/lib/dateUtils';

/**
 * Status filter configuration
 */
const STATUS_FILTERS = [
  { key: 'all', label: 'All', value: undefined },
  { key: 'pending', label: 'Pending', value: CommentStatus.PENDING },
  { key: 'approved', label: 'Approved', value: CommentStatus.APPROVED },
  { key: 'rejected', label: 'Rejected', value: CommentStatus.REJECTED },
  { key: 'spam', label: 'Spam', value: CommentStatus.SPAM },
];

/**
 * CommentModeration Page - Comment moderation page with filtering and bulk actions
 * Displays a list of all comments with moderation actions
 */
export const CommentModeration = () => {
  // Filter states
  const [activeStatusFilter, setActiveStatusFilter] = useState<CommentStatus | undefined>(
    undefined,
  );
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  // Bulk selection
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);

  // Build filter params
  const filters = useMemo(
    () => ({
      status: activeStatusFilter,
      sortBy,
      sortOrder,
    }),
    [activeStatusFilter, sortBy, sortOrder],
  );

  // Data fetching
  const { data, isLoading, error } = useComments(filters);
  const moderateCommentMutation = useModerateComment();
  const batchModerateMutation = useBatchModerateComments();
  const deleteCommentMutation = useDeleteComment();

  // Get author display name
  const getAuthorDisplay = (comment: Comment): string => {
    if (comment.author) {
      return `${comment.author.firstName} ${comment.author.lastName}`;
    }
    return comment.authorName || 'Anonymous';
  };

  // Table columns configuration
  const columns: Column<Comment>[] = [
    {
      header: 'Author',
      accessor: (row) => getAuthorDisplay(row),
      cell: (authorDisplay: string, row: Comment) => (
        <div>
          <div className="font-medium text-gray-900">{authorDisplay}</div>
          {row.authorEmail && <div className="text-xs text-gray-500 mt-0.5">{row.authorEmail}</div>}
        </div>
      ),
    },
    {
      header: 'Comment',
      accessor: 'body',
      cell: (body: string, row: Comment) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-700 line-clamp-2">{body}</p>
          <button
            onClick={() => handleViewClick(row)}
            className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-flex items-center gap-1"
          >
            <Eye size={12} />
            View full
          </button>
        </div>
      ),
    },
    {
      header: 'Content',
      accessor: (row) => row.contentRelation?.title || 'Unknown',
      cell: (title: string) => <span className="text-sm text-gray-700 line-clamp-1">{title}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (status: CommentStatus) => <Badge status={status} />,
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      sortable: true,
      cell: (date: string) => <span className="text-sm text-gray-600">{formatDateTime(date)}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => row.id,
      width: 'w-40',
      cell: (_id: string, row: Comment) => (
        <div className="flex items-center gap-1">
          {row.status !== CommentStatus.APPROVED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleModerate(row.id, CommentStatus.APPROVED);
              }}
              aria-label="Approve comment"
              title="Approve"
              className="text-success-600 hover:text-success-700 hover:bg-success-50"
            >
              <CheckCircle size={16} />
            </Button>
          )}
          {row.status !== CommentStatus.REJECTED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleModerate(row.id, CommentStatus.REJECTED);
              }}
              aria-label="Reject comment"
              title="Reject"
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <XCircle size={16} />
            </Button>
          )}
          {row.status !== CommentStatus.SPAM && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleModerate(row.id, CommentStatus.SPAM);
              }}
              aria-label="Mark as spam"
              title="Mark as Spam"
              className="text-warning-600 hover:text-warning-700 hover:bg-warning-50"
            >
              <AlertTriangle size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row);
            }}
            aria-label="Delete comment"
            title="Delete"
            className="text-error-600 hover:text-error-700 hover:bg-error-50"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleViewClick = (comment: Comment) => {
    setSelectedComment(comment);
    setDetailModalOpen(true);
  };

  const handleDeleteClick = (comment: Comment) => {
    setCommentToDelete(comment);
    setDeleteDialogOpen(true);
  };

  const handleModerate = async (
    id: string,
    status: CommentStatus.APPROVED | CommentStatus.REJECTED | CommentStatus.SPAM,
  ) => {
    try {
      await moderateCommentMutation.mutateAsync({ id, data: { status } });
      toast.success(
        `Comment ${status.toLowerCase() === 'approved' ? 'approved' : status.toLowerCase() === 'rejected' ? 'rejected' : 'marked as spam'} successfully`,
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to moderate comment');
    }
  };

  const handleBatchModerate = async (
    status: CommentStatus.APPROVED | CommentStatus.REJECTED | CommentStatus.SPAM,
  ) => {
    if (selectedCommentIds.length === 0) {
      toast.error('Please select comments to moderate');
      return;
    }

    try {
      const result = await batchModerateMutation.mutateAsync({
        commentIds: selectedCommentIds,
        status,
      });
      toast.success(`${result.count} comment(s) updated successfully`);
      setSelectedCommentIds([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to moderate comments');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;

    try {
      await deleteCommentMutation.mutateAsync(commentToDelete.id);
      toast.success('Comment deleted successfully');
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handleSelectionChange = (ids: string[]) => {
    setSelectedCommentIds(ids);
  };

  // Get counts by status for filter tabs
  const statusCounts = useMemo(() => {
    if (!data?.data) return {};

    const counts: Record<string, number> = {
      all: data.meta.total,
    };

    // Note: In a real scenario, you'd get these counts from the backend
    // For now, we'll just show the current filtered count
    return counts;
  }, [data]);

  return (
    <div className="space-y-6 animate-in-slide">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comment Moderation</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and moderate user comments across all content
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === filter.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              {statusCounts[filter.key] !== undefined && (
                <span className="ml-2 text-xs">({statusCounts[filter.key]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCommentIds.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900">
              {selectedCommentIds.length} comment(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBatchModerate(CommentStatus.APPROVED)}
                className="text-success-700 hover:bg-success-100"
              >
                <CheckCircle size={16} className="mr-1" />
                Approve Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBatchModerate(CommentStatus.REJECTED)}
                className="text-error-700 hover:bg-error-100"
              >
                <XCircle size={16} className="mr-1" />
                Reject Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBatchModerate(CommentStatus.SPAM)}
                className="text-warning-700 hover:bg-warning-100"
              >
                <AlertTriangle size={16} className="mr-1" />
                Mark as Spam
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCommentIds([])}>
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg">
          Failed to load comments. Please try again.
        </div>
      )}

      {/* Comments Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No comments found."
          sorting={{
            column: sortBy,
            order: sortOrder,
            onSortChange: handleSortChange,
          }}
          selectable
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedComment(null);
        }}
        title="Comment Details"
        size="lg"
      >
        {selectedComment && (
          <div className="space-y-4">
            {/* Author Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Author
              </h3>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{getAuthorDisplay(selectedComment)}</div>
                {selectedComment.authorEmail && (
                  <div className="text-gray-600 mt-1">{selectedComment.authorEmail}</div>
                )}
              </div>
            </div>

            {/* Content Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Content
              </h3>
              <div className="text-sm text-gray-900">
                {selectedComment.contentRelation?.title || 'Unknown'}
              </div>
            </div>

            {/* Comment Body */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Comment
              </h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {selectedComment.body}
              </div>
            </div>

            {/* Status and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Status
                </h3>
                <Badge status={selectedComment.status} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Posted
                </h3>
                <div className="text-sm text-gray-600">
                  {formatDateLong(selectedComment.createdAt)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedComment(null);
                }}
              >
                Close
              </Button>
              {selectedComment.status !== CommentStatus.APPROVED && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleModerate(selectedComment.id, CommentStatus.APPROVED);
                    setDetailModalOpen(false);
                    setSelectedComment(null);
                  }}
                  className="gap-1"
                >
                  <CheckCircle size={16} />
                  Approve
                </Button>
              )}
              {selectedComment.status !== CommentStatus.REJECTED && (
                <Button
                  variant="danger"
                  onClick={() => {
                    handleModerate(selectedComment.id, CommentStatus.REJECTED);
                    setDetailModalOpen(false);
                    setSelectedComment(null);
                  }}
                  className="gap-1"
                >
                  <XCircle size={16} />
                  Reject
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCommentToDelete(null);
        }}
        variant="danger"
        title="Delete Comment"
        message={
          commentToDelete
            ? `Are you sure you want to delete this comment? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteCommentMutation.isPending}
      />
    </div>
  );
};
