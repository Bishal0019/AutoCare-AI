/**
 * Select — AutoCare AI design system
 *
 * Styled <select> matching the Input component's visual language:
 * same height (h-9), same border, same focus ring.
 *
 * Usage:
 *   import Select from '@/components/ui/Select';
 *   <Select
 *     name="fuelType"
 *     label="Fuel type"
 *     placeholder="Select fuel type"
 *     options={[{ value: 'petrol', label: 'Petrol' }, ...]}
 *     error={errors?.fuelType}
 *   />
 */

import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

/**
 * @param {{
 *   label?:       string,
 *   hint?:        string,
 *   error?:       string,
 *   placeholder?: string,
 *   options:      { value: string, label: string }[],
 *   className?:   string,
 *   selectClass?: string,
 * } & React.SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function Select({
  label,
  hint,
  error,
  placeholder,
  options,
  className,
  selectClass,
  id,
  ...props
}) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-zinc-700 leading-none"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={clsx(
            'w-full h-9 rounded-md border text-sm text-zinc-900 bg-white',
            'pl-3 pr-8 appearance-none cursor-pointer',
            'transition-colors duration-150',
            'focus-visible:outline-none',
            'focus-visible:[box-shadow:0_0_0_1px_#18181B,0_0_0_3px_rgb(24_24_27_/_0.15)]',
            'disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-red-400 focus-visible:[box-shadow:0_0_0_1px_#DC2626,0_0_0_3px_rgb(220_38_38_/_0.15)]'
              : 'border-zinc-300 hover:border-zinc-400',
            selectClass,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown chevron — replaces the OS default arrow */}
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {hint && !hasError && (
        <p className="text-xs text-zinc-500 leading-relaxed">{hint}</p>
      )}
      {hasError && (
        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
