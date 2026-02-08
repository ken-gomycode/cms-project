import { forwardRef, SelectHTMLAttributes, useState } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Help text displayed below select */
  helpText?: string;
  /** Mark field as required */
  isRequired?: boolean;
  /** Options for the select */
  options?: Array<{ value: string; label: string }>;
}

/**
 * Select component with floating label, error states, and custom styling
 *
 * @example
 * ```tsx
 * <Select
 *   label="Status"
 *   options={[
 *     { value: 'draft', label: 'Draft' },
 *     { value: 'published', label: 'Published' }
 *   ]}
 *   error={errors.status?.message}
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, helpText, isRequired, className = '', id, options = [], children, ...props },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const showFloatingLabel = label && (isFocused || hasValue);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className="w-full">
        <div className="relative">
          {label && (
            <label
              htmlFor={selectId}
              className={`
                absolute left-3 transition-all duration-200 pointer-events-none z-10
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

          <select
            ref={ref}
            id={selectId}
            className={`
              w-full px-4 py-2.5 pr-10
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none
              appearance-none
              bg-white
              cursor-pointer
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
            aria-describedby={
              error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined
            }
            {...props}
          >
            {children ||
              options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
            {error && <AlertCircle className="text-error-500" size={20} aria-hidden="true" />}
            <ChevronDown
              className={`transition-transform duration-200 ${isFocused ? 'rotate-180' : ''} ${error ? 'text-error-500' : 'text-gray-400'}`}
              size={20}
              aria-hidden="true"
            />
          </div>
        </div>

        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1.5 text-sm text-error-600 flex items-center gap-1 animate-in-slide"
            role="alert"
          >
            {error}
          </p>
        )}

        {helpText && !error && (
          <p id={`${selectId}-help`} className="mt-1.5 text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
