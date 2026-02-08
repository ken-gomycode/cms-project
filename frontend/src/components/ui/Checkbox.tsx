import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Checkbox label */
  label?: string;
  /** Additional description text */
  description?: string;
  /** Error message to display */
  error?: string;
}

/**
 * Checkbox component with label and description support
 *
 * @example
 * ```tsx
 * <Checkbox
 *   label="Remember me"
 *   description="Stay logged in for 30 days"
 * />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', id, disabled, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              className="peer sr-only"
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? `${checkboxId}-error`
                  : description
                    ? `${checkboxId}-description`
                    : undefined
              }
              {...props}
            />

            <div
              className={`
                w-5 h-5 rounded border-2
                transition-all duration-200
                flex items-center justify-center
                cursor-pointer
                peer-focus:ring-4 peer-focus:ring-primary-50
                peer-checked:bg-primary-600 peer-checked:border-primary-600
                peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
                ${
                  error
                    ? 'border-error-300 peer-checked:bg-error-600 peer-checked:border-error-600'
                    : 'border-gray-300'
                }
                ${className}
              `}
              onClick={() => {
                if (!disabled && checkboxId) {
                  const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
                  checkbox?.click();
                }
              }}
            >
              <Check
                className="text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                size={14}
                strokeWidth={3}
                aria-hidden="true"
              />
            </div>
          </div>

          {(label || description) && (
            <div className="flex-1">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={`
                    block text-sm font-medium
                    cursor-pointer
                    ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}
                    ${error ? 'text-error-600' : ''}
                  `}
                >
                  {label}
                </label>
              )}

              {description && (
                <p
                  id={`${checkboxId}-description`}
                  className={`
                    mt-0.5 text-sm
                    ${disabled ? 'text-gray-400' : 'text-gray-500'}
                  `}
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${checkboxId}-error`}
            className="mt-1.5 ml-8 text-sm text-error-600 animate-in-slide"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
