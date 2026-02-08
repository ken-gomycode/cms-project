import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - shows spinner and disables interaction */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * Button component with multiple variants and states
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Save Changes
 * </Button>
 *
 * <Button variant="danger" isLoading>
 *   Deleting...
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform active:scale-[0.98]
      relative overflow-hidden
    `;

    const variantStyles = {
      primary: `
        bg-primary-600 text-white
        hover:bg-primary-700
        focus:ring-primary-500
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-white text-gray-700 border border-gray-300
        hover:bg-gray-50 hover:border-gray-400
        focus:ring-primary-500
        shadow-sm
      `,
      danger: `
        bg-error-600 text-white
        hover:bg-error-700
        focus:ring-error-500
        shadow-sm hover:shadow-md
      `,
      ghost: `
        bg-transparent text-gray-700
        hover:bg-gray-100
        focus:ring-primary-500
      `,
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyles}
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="animate-spin"
            size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
            aria-hidden="true"
          />
        )}
        <span className={isLoading ? 'opacity-70' : ''}>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';
