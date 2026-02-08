import { useState, useEffect, useCallback } from 'react';
import {
  Grid3X3,
  List,
  Upload,
  Edit2,
  Trash2,
  Copy,
  Image,
  Film,
  Music,
  FileText,
  File,
  X,
  Check,
} from 'lucide-react';
import { useMedia, useUploadMedia, useUpdateMedia, useDeleteMedia } from '@/api/hooks/useMedia';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { DataTable } from '@/components/ui/DataTable';
import type { Media } from '@/types';
import { toast } from '@/stores/toastStore';

type ViewMode = 'grid' | 'list';

type MediaType = 'all' | 'images' | 'videos' | 'documents' | 'audio';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'largest' | 'smallest';

/**
 * Format file size from bytes to human-readable string
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get mime type category
 */
const getMimeTypeCategory = (mimeType: string): MediaType => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'documents';
};

/**
 * Get icon for media type
 */
const getMediaIcon = (mimeType: string) => {
  const category = getMimeTypeCategory(mimeType);

  switch (category) {
    case 'images':
      return Image;
    case 'videos':
      return Film;
    case 'audio':
      return Music;
    case 'documents':
      if (mimeType === 'application/pdf') return FileText;
      return File;
    default:
      return File;
  }
};

/**
 * Get media thumbnail URL
 */
const getMediaThumbnail = (media: Media): string | null => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  if (media.thumbnailUrl) {
    return media.thumbnailUrl.startsWith('http')
      ? media.thumbnailUrl
      : `${API_URL}${media.thumbnailUrl}`;
  }

  if (getMimeTypeCategory(media.mimeType) === 'images') {
    return media.url.startsWith('http') ? media.url : `${API_URL}${media.url}`;
  }

  return null;
};

/**
 * Media Library Page Component
 */
export function MediaLibrary() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAlt, setUploadAlt] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Edit form state
  const [editAlt, setEditAlt] = useState('');
  const [editCaption, setEditCaption] = useState('');

  // Build filter params
  const getFilterParams = useCallback(() => {
    const params: any = {
      page,
      limit: 24,
      search: searchQuery || undefined,
    };

    // Type filter
    if (typeFilter !== 'all') {
      const mimeTypeMap: Record<MediaType, string> = {
        images: 'image/',
        videos: 'video/',
        audio: 'audio/',
        documents: 'application/',
        all: '',
      };
      params.mimeType = mimeTypeMap[typeFilter];
    }

    // Sort
    const sortMap: Record<SortOption, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
      newest: { sortBy: 'createdAt', sortOrder: 'desc' },
      oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
      'name-asc': { sortBy: 'originalName', sortOrder: 'asc' },
      largest: { sortBy: 'size', sortOrder: 'desc' },
      smallest: { sortBy: 'size', sortOrder: 'asc' },
    };
    const sort = sortMap[sortOption];
    params.sortBy = sort.sortBy;
    params.sortOrder = sort.sortOrder;

    return params;
  }, [page, searchQuery, typeFilter, sortOption]);

  const { data, isLoading, error } = useMedia(getFilterParams());
  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMedia();
  const deleteMutation = useDeleteMedia();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortOption]);

  // Handle file upload
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    for (const file of uploadFiles) {
      try {
        await uploadMutation.mutateAsync({
          file,
          alt: uploadAlt || undefined,
          caption: uploadCaption || undefined,
        });
      } catch (error) {
        // Error handled by mutation
      }
    }

    // Reset form
    setUploadFiles([]);
    setUploadAlt('');
    setUploadCaption('');
    setIsUploadModalOpen(false);
  };

  // Handle edit
  const handleEdit = async () => {
    if (!selectedMedia) return;

    await updateMutation.mutateAsync({
      id: selectedMedia.id,
      data: {
        alt: editAlt || undefined,
        caption: editCaption || undefined,
      },
    });

    setIsEditModalOpen(false);
    setSelectedMedia(null);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirmId(null);
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
  };

  // Copy URL to clipboard
  const handleCopyUrl = (media: Media) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = media.url.startsWith('http') ? media.url : `${API_URL}${media.url}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  // Open edit modal
  const openEditModal = (media: Media) => {
    setSelectedMedia(media);
    setEditAlt(media.alt || '');
    setEditCaption(media.caption || '');
    setIsEditModalOpen(true);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setUploadFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadFiles((prev) => [...prev, ...files]);
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mediaItems = data?.data || [];
  const totalPages = data?.meta.totalPages || 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-wider">
            Media Library
          </h1>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={16} />
            Upload
          </Button>
        </div>

        {/* Filters and View Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              type="search"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as MediaType)}>
              <option value="all">All Types</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="documents">Documents</option>
              <option value="audio">Audio</option>
            </Select>
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="largest">Largest First</option>
              <option value="smallest">Smallest First</option>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="flex-1"
              >
                <Grid3X3 size={16} />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="flex-1"
              >
                <List size={16} />
                List
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900">
              {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setBulkDeleteConfirm(true)}>
                <Trash2 size={16} />
                Delete Selected
              </Button>
              <Button variant="ghost" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-error-600">Failed to load media library</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-500">No media files found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaItems.map((media) => {
                const thumbnail = getMediaThumbnail(media);
                const Icon = getMediaIcon(media.mimeType);
                const isSelected = selectedIds.includes(media.id);

                return (
                  <div
                    key={media.id}
                    className={`
                      relative bg-white rounded-lg border-2 shadow-sm hover:shadow-lg
                      transition-all duration-200 overflow-hidden cursor-pointer group
                      ${isSelected ? 'border-primary-500' : 'border-gray-200'}
                    `}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedIds(selectedIds.filter((id) => id !== media.id));
                      } else {
                        setSelectedIds([...selectedIds, media.id]);
                      }
                    }}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 bg-primary-500 text-white rounded-full p-1">
                        <Check size={16} />
                      </div>
                    )}

                    {/* Preview */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={media.alt || media.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon size={48} className="text-gray-400" />
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(media);
                        }}
                        className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(media);
                        }}
                        className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Copy URL"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(media.id);
                        }}
                        className="p-2 bg-error-600 hover:bg-error-700 text-white rounded-lg transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {media.originalName}
                      </p>
                      <p className="text-xs text-gray-500">{formatFileSize(media.size)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <DataTable
            columns={[
              {
                header: 'Preview',
                accessor: (media: Media) => {
                  const thumbnail = getMediaThumbnail(media);
                  const Icon = getMediaIcon(media.mimeType);
                  return thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={media.alt || media.originalName}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      <Icon size={20} className="text-gray-400" />
                    </div>
                  );
                },
                width: 'w-16',
              },
              {
                header: 'Filename',
                accessor: 'originalName',
                sortable: true,
              },
              {
                header: 'Type',
                accessor: (media: Media) => media.mimeType.split('/')[0],
              },
              {
                header: 'Size',
                accessor: (media: Media) => formatFileSize(media.size),
              },
              {
                header: 'Uploaded By',
                accessor: (media: Media) =>
                  media.uploadedBy
                    ? `${media.uploadedBy.firstName} ${media.uploadedBy.lastName}`
                    : 'Unknown',
              },
              {
                header: 'Date',
                accessor: (media: Media) => new Date(media.createdAt).toLocaleDateString(),
              },
              {
                header: 'Actions',
                accessor: (media: Media) => (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(media);
                      }}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      aria-label="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyUrl(media);
                      }}
                      className="p-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      aria-label="Copy URL"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(media.id);
                      }}
                      className="p-1.5 text-error-600 hover:bg-error-50 rounded transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={mediaItems}
            isLoading={isLoading}
            emptyMessage="No media files found"
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination={{
              page,
              totalPages,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFiles([]);
          setUploadAlt('');
          setUploadCaption('');
        }}
        title="Upload Media"
      >
        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
            `}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500 mb-4">Max file size: 10MB</p>
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="inline-block">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-pointer">
                Select Files
              </span>
            </label>
          </div>

          {/* Selected Files */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected Files:</p>
              {uploadFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    onClick={() => removeUploadFile(index)}
                    className="p-1.5 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Alt Text */}
          <Input
            label="Alt Text (Optional)"
            placeholder="Describe the image for accessibility"
            value={uploadAlt}
            onChange={(e) => setUploadAlt(e.target.value)}
          />

          {/* Caption */}
          <Textarea
            label="Caption (Optional)"
            placeholder="Add a caption"
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            rows={3}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFiles([]);
                setUploadAlt('');
                setUploadCaption('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || uploadMutation.isPending}
              isLoading={uploadMutation.isPending}
            >
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      {selectedMedia && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedMedia(null);
          }}
          title="Edit Media"
        >
          <div className="space-y-4">
            {/* Preview */}
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {getMediaThumbnail(selectedMedia) ? (
                <img
                  src={getMediaThumbnail(selectedMedia)!}
                  alt={selectedMedia.alt || selectedMedia.originalName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const Icon = getMediaIcon(selectedMedia.mimeType);
                    return <Icon size={64} className="text-gray-400" />;
                  })()}
                  <p className="text-sm text-gray-500">{selectedMedia.originalName}</p>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Filename</p>
                <p className="font-medium text-gray-900">{selectedMedia.filename}</p>
              </div>
              <div>
                <p className="text-gray-500">Size</p>
                <p className="font-medium text-gray-900">{formatFileSize(selectedMedia.size)}</p>
              </div>
              {selectedMedia.width && selectedMedia.height && (
                <div>
                  <p className="text-gray-500">Dimensions</p>
                  <p className="font-medium text-gray-900">
                    {selectedMedia.width} × {selectedMedia.height}
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium text-gray-900">{selectedMedia.mimeType}</p>
              </div>
              <div>
                <p className="text-gray-500">Uploaded</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedMedia.createdAt).toLocaleDateString()}
                </p>
              </div>
              {selectedMedia.uploadedBy && (
                <div>
                  <p className="text-gray-500">Uploaded By</p>
                  <p className="font-medium text-gray-900">
                    {selectedMedia.uploadedBy.firstName} {selectedMedia.uploadedBy.lastName}
                  </p>
                </div>
              )}
            </div>

            {/* Editable Fields */}
            <Input
              label="Alt Text"
              placeholder="Describe the image for accessibility"
              value={editAlt}
              onChange={(e) => setEditAlt(e.target.value)}
            />

            <Textarea
              label="Caption"
              placeholder="Add a caption"
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={3}
            />

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button
                variant="danger"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setDeleteConfirmId(selectedMedia.id);
                }}
              >
                <Trash2 size={16} />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedMedia(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEdit}
                  disabled={updateMutation.isPending}
                  isLoading={updateMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            handleDelete(deleteConfirmId);
          }
        }}
        title="Delete Media"
        message="Are you sure you want to delete this media file? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Media"
        message={`Are you sure you want to delete ${selectedIds.length} media file${
          selectedIds.length !== 1 ? 's' : ''
        }? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
