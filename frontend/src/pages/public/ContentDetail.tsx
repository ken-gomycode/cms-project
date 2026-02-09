import { useState, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, MessageCircle, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContentBySlug } from '@/api/hooks/useContent';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { formatDateLong, formatRelative } from '@/lib/dateUtils';
import { Comment, CreateCommentRequest, PaginatedResponse, ContentWithRelations } from '@/types';
import axios from '@/lib/axios';
import { queryKeys } from '@/api/queryKeys';

/**
 * Content Detail page - Shows full article with comments
 */
export const ContentDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Form state for comment submission
  const [commentBody, setCommentBody] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Fetch content by slug
  const {
    data: content,
    isLoading: isLoadingContent,
    error: contentError,
  } = useContentBySlug(slug || '');

  // Fetch comments for this content
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery({
    queryKey: queryKeys.comments.list({ contentId: content?.id }),
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      const response = await axios.get<PaginatedResponse<Comment>>(
        `/comments/content/${content!.id}`,
      );
      return response.data;
    },
    enabled: !!content?.id,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentRequest): Promise<Comment> => {
      const response = await axios.post<Comment>('/comments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list({ contentId: content!.id }),
      });
      setCommentBody('');
      setGuestName('');
      setGuestEmail('');
      setReplyingTo(null);
      toast.success('Comment submitted! It will appear after moderation.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit comment');
    },
  });

  // Handle comment form submission
  const handleCommentSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!content) return;

    if (!commentBody.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!isAuthenticated && (!guestName.trim() || !guestEmail.trim())) {
      toast.error('Please enter your name and email');
      return;
    }

    const commentData: CreateCommentRequest = {
      body: commentBody,
      contentId: content.id,
      parentId: replyingTo || undefined,
    };

    if (!isAuthenticated) {
      commentData.authorName = guestName;
      commentData.authorEmail = guestEmail;
    }

    createCommentMutation.mutate(commentData);
  };

  // Helper to get author full name
  const getAuthorName = (author?: { firstName: string; lastName: string }) => {
    if (!author) return 'Unknown Author';
    return `${author.firstName} ${author.lastName}`;
  };

  // Helper to get comment author name
  const getCommentAuthorName = (comment: Comment) => {
    if (comment.author) {
      return `${comment.author.firstName} ${comment.author.lastName}`;
    }
    return comment.authorName || 'Anonymous';
  };

  // Helper to extract categories from nested structure
  const getCategories = () => {
    if (!content) return [];
    const contentWithRelations = content as ContentWithRelations;
    if (!contentWithRelations.categories || contentWithRelations.categories.length === 0) return [];
    return contentWithRelations.categories.map((c) => c.category);
  };

  // Helper to extract tags from nested structure
  const getTags = () => {
    if (!content) return [];
    const contentWithRelations = content as ContentWithRelations;
    if (!contentWithRelations.tags || contentWithRelations.tags.length === 0) return [];
    return contentWithRelations.tags.map((t) => t.tag);
  };

  // Loading State
  if (isLoadingContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error State
  if (contentError || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h2>
          <p className="text-gray-600 mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const categories = getCategories();
  const tags = getTags();
  const comments = commentsData?.data || [];

  // Filter out non-approved comments (for public view)
  const approvedComments = comments.filter((c) => c.status === 'APPROVED');

  // Organize comments into parent-child structure
  const topLevelComments = approvedComments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => approvedComments.filter((c) => c.parentId === parentId);

  return (
    <div className="min-h-screen bg-gray-50">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.id}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{content.title}</h1>

          {/* Excerpt */}
          {content.excerpt && <p className="text-xl text-gray-600 mb-6">{content.excerpt}</p>}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                {content.author?.firstName?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{getAuthorName(content.author)}</p>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{formatRelative(content.publishedAt || content.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <Calendar size={14} />
              <span>{formatDateLong(content.publishedAt || content.createdAt)}</span>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {content.featuredImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={
                typeof content.featuredImage === 'string'
                  ? content.featuredImage
                  : (content.featuredImage as any)?.url || ''
              }
              alt={content.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Article Body */}
        <div className="prose prose-lg max-w-none mb-12">
          <div
            dangerouslySetInnerHTML={{ __html: content.body }}
            className="text-gray-800 leading-relaxed"
          />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-12 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={16} className="text-gray-500" />
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageCircle size={24} />
            Comments ({approvedComments.length})
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {replyingTo ? 'Reply to Comment' : 'Leave a Comment'}
            </h3>

            {/* Guest Name & Email (if not logged in) */}
            {!isAuthenticated && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            )}

            {/* Comment Body */}
            <Textarea
              label="Comment"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              required
            />

            {/* Submit Button */}
            <div className="flex items-center gap-3 mt-4">
              <Button
                type="submit"
                disabled={createCommentMutation.isPending}
                isLoading={createCommentMutation.isPending}
              >
                <Send size={16} />
                Submit Comment
              </Button>

              {replyingTo && (
                <Button type="button" variant="secondary" onClick={() => setReplyingTo(null)}>
                  Cancel Reply
                </Button>
              )}
            </div>

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 mt-3">
                Your comment will be reviewed before appearing on the site.
              </p>
            )}
          </form>

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : commentsError ? (
            <div className="text-center py-8 text-gray-500">
              Failed to load comments. Please try again later.
            </div>
          ) : approvedComments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {topLevelComments.map((comment) => {
                const replies = getReplies(comment.id);

                return (
                  <div key={comment.id} className="space-y-4">
                    {/* Comment */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold">
                          {getCommentAuthorName(comment).charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {getCommentAuthorName(comment)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatRelative(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                        </div>

                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2"
                        >
                          Reply
                        </button>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-14 space-y-4">
                        {replies.map((reply) => (
                          <div key={reply.id} className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-semibold">
                                {getCommentAuthorName(reply).charAt(0).toUpperCase()}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {getCommentAuthorName(reply)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatRelative(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                  {reply.body}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </article>
    </div>
  );
};
