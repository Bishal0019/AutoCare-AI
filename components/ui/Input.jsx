/**
 * Input — AutoCare AI design system
 *
 * Controlled or uncontrolled text input with consistent label, hint,
 * and error message layout.
 *
 * Usage:
 *   import Input from '@/components/ui/Input';
 *   <Input label="Email address" type="email" placeholder="you@example.com" />
 *   <Input label="VIN" error="Invalid VIN format" value={vin} onChange={...} />
 */

import { clsx } from 'clsx';

/**
 * @param {{
 *   label?:       string,
 *   hint?:        string,
 *   error?:       string,
 *   className?:   string,
 *   inputClass?:  string,
 *   leading?:     React.ReactNode,   // icon/text before input value
 *   trailing?:    React.ReactNode,   // icon/text after input value
 * } & React.InputHTMLAttributes<HTMLInputElement>} props
 */
export default function Input({
  label,
  hint,
  error,
  className,
  inputClass,
  leading,
  trailing,
  id,
  ...props
}) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-700 leading-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leading && (
          <div className="absolute left-3 flex items-center pointer-events-none text-zinc-400">
            {leading}
          </div>
        )}

        <input
          id={inputId}
          className={clsx(
            'w-full h-9 rounded-md border text-sm text-zinc-900 bg-white',
            'placeholder:text-zinc-400',
            'transition-colors duration-150',
            'focus-visible:outline-none',
            /* Focus ring via box-shadow so border doesn't jump layout */
            'focus-visible:[box-shadow:0_0_0_1px_#18181B,0_0_0_3px_rgb(24_24_27_/_0.15)]',
            'disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-red-400 focus-visible:[box-shadow:0_0_0_1px_#DC2626,0_0_0_3px_rgb(220_38_38_/_0.15)]'
              : 'border-zinc-300 hover:border-zinc-400',
            leading  ? 'pl-9'   : 'px-3',
            trailing ? 'pr-9'   : 'px-3',
            inputClass,
          )}
          {...props}
        />

        {trailing && (
          <div className="absolute right-3 flex items-center pointer-events-none text-zinc-400">
            {trailing}
          </div>
        )}
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
