/**
 * Analytics Dashboard - Dedicated analytics and reporting page
 *
 * Provides comprehensive analytics including:
 * - Summary statistics (views, visitors, content counts)
 * - Top content by views with configurable time periods
 * - Detailed per-content analytics with daily breakdown
 *
 * Editorial aesthetic with data visualization focus
 */

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  FileText,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { useDashboardStats, useTopContent } from '@/api/hooks';
import { useContentAnalytics } from '@/api/hooks/useAnalytics';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, formatDateShort } from '@/lib/dateUtils';

/**
 * Time period options for analytics
 */
const TIME_PERIODS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
] as const;

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
      iconBg: 'bg-success-100',
      iconColor: 'text-success-600',
      accent: 'bg-success-500',
    },
    gray: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      accent: 'bg-gray-400',
    },
    primary: {
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
      accent: 'bg-primary-500',
    },
    warning: {
      iconBg: 'bg-warning-100',
      iconColor: 'text-warning-600',
      accent: 'bg-warning-500',
    },
    info: {
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-700',
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
      {/* Accent bar */}
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

        <div
          className={`${colors.iconBg} rounded-full p-3
                     transition-all duration-300 group-hover:scale-110`}
        >
          <Icon className={`w-6 h-6 ${colors.iconColor}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

/**
 * Main Analytics Dashboard Component
 */
export const AnalyticsDashboard = () => {
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Data hooks
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const {
    data: topContent,
    isLoading: topContentLoading,
    error: topContentError,
  } = useTopContent();
  const {
    data: contentAnalytics,
    isLoading: contentAnalyticsLoading,
    error: contentAnalyticsError,
  } = useContentAnalytics(selectedContentId, selectedDays);

  const selectedPeriod = TIME_PERIODS.find((p) => p.value === selectedDays) || TIME_PERIODS[2];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary-600" />
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Comprehensive content performance and audience insights
              </p>
            </div>

            {/* Time Period Filter */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg
                         hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <Calendar className="w-4 h-4" />
                {selectedPeriod.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPeriodDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPeriodDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {TIME_PERIODS.map((period) => (
                      <button
                        key={period.value}
                        onClick={() => {
                          setSelectedDays(period.value);
                          setShowPeriodDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          period.value === selectedDays
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-12">
        {/* Summary Stats Grid */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={Eye}
                label="Total Views (30d)"
                value={stats.views.last30Days.total}
                accentColor="primary"
                delay={0}
              />
              <StatCard
                icon={Users}
                label="Unique Visitors (30d)"
                value={stats.views.last30Days.unique}
                accentColor="info"
                delay={100}
              />
              <StatCard
                icon={FileText}
                label="Total Content"
                value={stats.totalContent}
                accentColor="gray"
                delay={200}
              />
              <StatCard
                icon={MessageSquare}
                label="Published Content"
                value={stats.contentByStatus.PUBLISHED || 0}
                accentColor="success"
                delay={300}
              />
            </div>
          ) : null}
        </section>

        {/* Top Content Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Top Content by Views</h2>
            <span className="text-sm text-gray-500 ml-2">
              ({selectedPeriod.label.toLowerCase()})
            </span>
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                        Views
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                        Unique Visitors
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
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
                            onClick={() => setSelectedContentId(item.content.id)}
                            className="text-gray-900 font-medium hover:text-primary-600 transition-colors text-left flex items-center gap-2 group"
                          >
                            {item.content.title}
                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {item.views.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              {item.uniqueVisitors.toLocaleString()}
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

        {/* Content Performance Detail */}
        {selectedContentId && (
          <section
            className="bg-white rounded-lg border border-gray-200 p-8"
            style={{
              animation: 'slideUpFade 0.4s ease-out both',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary-600" />
                <h2 className="text-2xl font-bold text-gray-900">Content Performance</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContentId(null)}>
                Close
              </Button>
            </div>

            {contentAnalyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : contentAnalyticsError ? (
              <div className="bg-error-50 border border-error-200 rounded-lg p-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-error-900">Failed to load content analytics</h3>
                  <p className="text-sm text-error-700 mt-1">
                    {(contentAnalyticsError as Error).message || 'An error occurred'}
                  </p>
                </div>
              </div>
            ) : contentAnalytics ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-1">
                      Period
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{selectedPeriod.label}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(contentAnalytics.period.startDate)} -{' '}
                      {formatDate(contentAnalytics.period.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-1">
                      Total Views
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {contentAnalytics.totals.views.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-1">
                      Unique Visitors
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {contentAnalytics.totals.uniqueVisitors.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Daily Stats Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
                  {contentAnalytics.dailyStats.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Views
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Unique Visitors
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {contentAnalytics.dailyStats.map((stat, index) => (
                            <tr
                              key={stat.date.toString()}
                              className="hover:bg-gray-50 transition-colors"
                              style={{
                                animation: `slideUpFade 0.3s ease-out ${index * 30}ms both`,
                              }}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDateShort(stat.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                {stat.views.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                {stat.uniqueVisitors.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">
                      No daily data available for this period.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}
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
