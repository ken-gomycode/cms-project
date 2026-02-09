/**
 * Admin Dashboard - Editorial-inspired analytics interface
 *
 * Aesthetic: Editorial data dashboard with Swiss design influences
 * - Clean typography with serif accents
 * - Intentional asymmetry in layout
 * - Subtle animations on data reveal
 * - Refined color palette with purposeful accents
 */

import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit,
  Eye,
  Users,
  MessageSquare,
  BarChart3,
  Plus,
  Upload,
  ExternalLink,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  useDashboardStats,
  useTopContent,
  useRecentComments,
  useUpdateCommentStatus,
} from '@/api/hooks';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/stores/toastStore';
import { CommentStatus } from '@/types/enums.types';
import { formatRelative } from '@/lib/dateUtils';

/**
 * Stat card component with refined visual design
 */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  accentColor: 'success' | 'gray' | 'primary' | 'warning' | 'info';
  delay?: number;
}

const StatCard = ({ icon: Icon, label, value, accentColor, delay = 0 }: StatCardProps) => {
  const colorMap = {
    success: {
      bg: 'bg-success-50',
      iconBg: 'bg-success-100',
      iconColor: 'text-success-600',
      border: 'border-success-200',
      accent: 'bg-success-500',
    },
    gray: {
      bg: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      border: 'border-gray-200',
      accent: 'bg-gray-400',
    },
    primary: {
      bg: 'bg-primary-50',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
      border: 'border-primary-200',
      accent: 'bg-primary-500',
    },
    warning: {
      bg: 'bg-warning-50',
      iconBg: 'bg-warning-100',
      iconColor: 'text-warning-600',
      border: 'border-warning-200',
      accent: 'bg-warning-500',
    },
    info: {
      bg: 'bg-primary-50',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-700',
      border: 'border-primary-300',
      accent: 'bg-primary-600',
    },
  };

  const colors = colorMap[accentColor];

  return (
    <div
      className="group relative bg-white rounded-lg border border-gray-200 p-6
                 transition-all duration-300 hover:shadow-lg hover:border-gray-300
                 overflow-hidden"
      style={{
        animation: `slideUpFade 0.6s ease-out ${delay}ms both`,
      }}
    >
      {/* Accent bar - editorial detail */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}
                   transform scale-x-0 group-hover:scale-x-100
                   transition-transform duration-500 origin-left`}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-3">{label}</p>
          <p className="text-4xl font-bold text-gray-900 tracking-tight">
            {value.toLocaleString()}
          </p>
        </div>

        {/* Icon container */}
        <div
          className={`${colors.iconBg} rounded-full p-3
                     transition-all duration-300 group-hover:scale-110`}
        >
          <Icon className={`w-6 h-6 ${colors.iconColor}`} strokeWidth={2} />
        </div>
      </div>

      {/* Subtle background pattern */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }}
      />
    </div>
  );
};

/**
 * Main Dashboard Component
 */
export const Dashboard = () => {
  const navigate = useNavigate();

  // Data hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const {
    data: topContent,
    isLoading: topContentLoading,
    error: topContentError,
  } = useTopContent();
  const {
    data: recentComments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useRecentComments();

  // Mutations
  const updateCommentStatus = useUpdateCommentStatus();

  // Handlers
  const handleApproveComment = async (commentId: string) => {
    try {
      await updateCommentStatus.mutateAsync({
        commentId,
        status: CommentStatus.APPROVED,
      });
      toast.success('Comment approved successfully');
    } catch (error) {
      toast.error('Failed to approve comment');
    }
  };

  const handleRejectComment = async (commentId: string) => {
    try {
      await updateCommentStatus.mutateAsync({
        commentId,
        status: CommentStatus.REJECTED,
      });
      toast.success('Comment rejected');
    } catch (error) {
      toast.error('Failed to reject comment');
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with editorial typography */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Content analytics and moderation overview</p>
        </div>
      </div>

      <div className="px-8 pb-12">
        {/* Stats Grid */}
        <section className="mb-12">
          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : statsError ? (
            <div className="bg-error-50 border border-error-200 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-error-900">Failed to load statistics</h3>
                <p className="text-sm text-error-700 mt-1">
                  {(statsError as Error).message || 'An error occurred'}
                </p>
              </div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                icon={FileText}
                label="Published Content"
                value={stats.contentByStatus.PUBLISHED || 0}
                accentColor="success"
                delay={0}
              />
              <StatCard
                icon={Edit}
                label="Draft Content"
                value={stats.contentByStatus.DRAFT || 0}
                accentColor="gray"
                delay={100}
              />
              <StatCard
                icon={Eye}
                label="Total Views (30d)"
                value={stats.views.last30Days.total}
                accentColor="primary"
                delay={200}
              />
              <StatCard
                icon={Users}
                label="Unique Visitors (30d)"
                value={stats.views.last30Days.unique}
                accentColor="info"
                delay={300}
              />
              <StatCard
                icon={MessageSquare}
                label="Pending Comments"
                value={recentComments?.meta.total || 0}
                accentColor="warning"
                delay={400}
              />
              <StatCard
                icon={BarChart3}
                label="Total Content"
                value={stats.totalContent}
                accentColor="gray"
                delay={500}
              />
            </div>
          ) : null}
        </section>

        {/* Top Content Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Top Content by Views</h2>
          </div>

          {topContentLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : topContentError ? (
            <div className="bg-error-50 border border-error-200 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-error-900">Failed to load top content</h3>
                <p className="text-sm text-error-700 mt-1">
                  {(topContentError as Error).message || 'An error occurred'}
                </p>
              </div>
            </div>
          ) : topContent && topContent.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topContent.map((item, index) => (
                      <tr
                        key={item.content.id}
                        className="hover:bg-gray-50 transition-colors"
                        style={{
                          animation: `slideUpFade 0.4s ease-out ${index * 50}ms both`,
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/admin/content/${item.content.id}`)}
                            className="text-gray-900 font-medium hover:text-primary-600
                                     transition-colors text-left"
                          >
                            {item.content.title}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.content.author.firstName} {item.content.author.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {item.views.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge status={item.content.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No content data available yet</p>
            </div>
          )}
        </section>

        {/* Bottom Grid: Recent Comments + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Pending Comments - Takes 2 columns */}
          <section className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-warning-600" />
              <h2 className="text-2xl font-bold text-gray-900">Pending Comments</h2>
            </div>

            {commentsLoading ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : commentsError ? (
              <div className="bg-error-50 border border-error-200 rounded-lg p-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-error-900">Failed to load comments</h3>
                  <p className="text-sm text-error-700 mt-1">
                    {(commentsError as Error).message || 'An error occurred'}
                  </p>
                </div>
              </div>
            ) : recentComments && recentComments.data.length > 0 ? (
              <div className="space-y-4">
                {recentComments.data.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="bg-white rounded-lg border border-gray-200 p-6
                             hover:shadow-md transition-all duration-300"
                    style={{
                      animation: `slideUpFade 0.4s ease-out ${index * 100}ms both`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{comment.authorName}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          on{' '}
                          <span className="font-medium text-gray-700">
                            {comment.contentRelation?.title || 'Content'}
                          </span>
                        </p>
                      </div>
                      <time className="text-xs text-gray-500 whitespace-nowrap">
                        {formatRelative(comment.createdAt)}
                      </time>
                    </div>

                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                      {truncateText(comment.body, 120)}
                    </p>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveComment(comment.id)}
                        isLoading={updateCommentStatus.isPending}
                        className="bg-success-600 hover:bg-success-700 focus:ring-success-500"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectComment(comment.id)}
                        isLoading={updateCommentStatus.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No pending comments</p>
                <p className="text-sm text-gray-500 mt-1">All caught up!</p>
              </div>
            )}
          </section>

          {/* Quick Actions - Takes 1 column */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
            </div>

            <div
              className="bg-white rounded-lg border border-gray-200 p-6 space-y-3"
              style={{
                animation: 'slideUpFade 0.6s ease-out 0.3s both',
              }}
            >
              <Button
                fullWidth
                variant="primary"
                onClick={() => navigate('/admin/content/new')}
                className="justify-start"
              >
                <Plus className="w-5 h-5" />
                New Post
              </Button>

              <Button
                fullWidth
                variant="secondary"
                onClick={() => navigate('/admin/media')}
                className="justify-start"
              >
                <Upload className="w-5 h-5" />
                Upload Media
              </Button>

              <Button
                fullWidth
                variant="ghost"
                onClick={() => window.open('/', '_blank')}
                className="justify-start border border-gray-200"
              >
                <ExternalLink className="w-5 h-5" />
                View Site
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
