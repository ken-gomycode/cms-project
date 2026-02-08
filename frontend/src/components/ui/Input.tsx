import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Help text displayed below input */
  helpText?: string;
  /** Mark field as required */
  isRequired?: boolean;
}

/**
 * Input component with floating label, error states, and help text
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email Address"
 *   type="email"
 *   error={errors.email?.message}
 *   isRequired
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, isRequired, className = '', id, placeholder, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const showFloatingLabel = label && (isFocused || hasValue || placeholder);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className="w-full">
        <div className="relative">
          {label && (
            <label
              htmlFor={inputId}
              className={`
                absolute left-3 transition-all duration-200 pointer-events-none
                ${
                  showFloatingLabel
                    ? '-top-2 text-xs bg-white px-1 text-primary-600 font-medium'
                    : 'top-2.5 text-gray-500'
                }
                ${error ? 'text-error-600' : ''}
              `}
            >
              {label}
              {isRequired && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}

          <input
            ref={ref}
            id={inputId}
            placeholder={isFocused ? placeholder : ''}
            className={`
              w-full px-4 py-2.5
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${label ? 'pt-3' : ''}
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
            aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="text-error-500" size={20} aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error-600 flex items-center gap-1 animate-in-slide"
            role="alert"
          >
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={`${inputId}-help`} className="mt-1.5 text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
