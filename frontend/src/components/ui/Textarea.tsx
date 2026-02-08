import { forwardRef, TextareaHTMLAttributes, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Help text displayed below textarea */
  helpText?: string;
  /** Mark field as required */
  isRequired?: boolean;
}

/**
 * Textarea component with floating label, error states, and help text
 *
 * @example
 * ```tsx
 * <Textarea
 *   label="Description"
 *   rows={4}
 *   error={errors.description?.message}
 *   isRequired
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helpText, isRequired, className = '', id, rows = 4, placeholder, ...props },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const showFloatingLabel = label && (isFocused || hasValue || placeholder);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className="w-full">
        <div className="relative">
          {label && (
            <label
              htmlFor={textareaId}
              className={`
                absolute left-3 transition-all duration-200 pointer-events-none z-10
                ${
                  showFloatingLabel
                    ? '-top-2 text-xs bg-white px-1 text-primary-600 font-medium'
                    : 'top-3 text-gray-500'
                }
                ${error ? 'text-error-600' : ''}
              `}
            >
              {label}
              {isRequired && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}

          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            placeholder={isFocused ? placeholder : ''}
            className={`
              w-full px-4 py-3
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none
              resize-y
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${label ? 'pt-4' : ''}
              ${
                error
                  ? 'border-error-300 focus:border-error-500 focus:ring-4 focus:ring-error-100'
                  : 'border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'
              }
              ${className}
            `}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined
            }
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-3">
              <AlertCircle className="text-error-500" size={20} aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-error-600 flex items-center gap-1 animate-in-slide"
            role="alert"
          >
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={`${textareaId}-help`} className="mt-1.5 text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
