import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className */
  className?: string;
}

/**
 * Circular loading spinner
 *
 * @example
 * ```tsx
 * <Spinner size="md" />
 * ```
 */
export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => {
  const sizeClasses = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <Loader2
      className={`animate-spin text-primary-600 ${className}`}
      size={sizeClasses[size]}
      aria-label="Loading"
    />
  );
};

/**
 * Full-page loading spinner with backdrop
 *
 * @example
 * ```tsx
 * {isLoading && <PageSpinner />}
 * ```
 */
export const PageSpinner = () => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
};
