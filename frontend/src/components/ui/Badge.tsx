import { ContentStatus } from '@/types';

export interface BadgeProps {
  /** Status variant */
  status: ContentStatus | string;
  /** Optional className */
  className?: string;
}

/**
 * Status badge component for content states
 *
 * @example
 * ```tsx
 * <Badge status="PUBLISHED" />
 * <Badge status="DRAFT" />
 * ```
 */
export const Badge = ({ status, className = '' }: BadgeProps) => {
  const config: Record<
    string,
    { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }
  > = {
    [ContentStatus.DRAFT]: {
      label: 'Draft',
      dotColor: 'bg-gray-400',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
    },
    [ContentStatus.PUBLISHED]: {
      label: 'Published',
      dotColor: 'bg-success-500',
      textColor: 'text-success-700',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
    },
    [ContentStatus.ARCHIVED]: {
      label: 'Archived',
      dotColor: 'bg-warning-500',
      textColor: 'text-warning-700',
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
    },
    [ContentStatus.SCHEDULED]: {
      label: 'Scheduled',
      dotColor: 'bg-primary-500',
      textColor: 'text-primary-700',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
    },
    // Support for UserRole badges
    ADMIN: {
      label: 'Admin',
      dotColor: 'bg-error-500',
      textColor: 'text-error-700',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
    },
    AUTHOR: {
      label: 'Author',
      dotColor: 'bg-primary-500',
      textColor: 'text-primary-700',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
    },
    EDITOR: {
      label: 'Editor',
      dotColor: 'bg-success-500',
      textColor: 'text-success-700',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
    },
    SUBSCRIBER: {
      label: 'Subscriber',
      dotColor: 'bg-gray-500',
      textColor: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };

  const badgeConfig = config[status] || config[ContentStatus.DRAFT];
  const { label, dotColor, textColor, bgColor, borderColor } = badgeConfig;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        rounded-full
        text-xs font-medium
        border
        ${textColor} ${bgColor} ${borderColor}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      {label}
    </span>
  );
};
