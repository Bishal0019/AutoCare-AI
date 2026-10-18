/**
 * Badge — AutoCare AI design system
 *
 * Inline status indicator. Intentionally small and restrained — not the
 * primary way to communicate status (use colour + text for that).
 *
 * Variants: default | success | warning | error | info | accent
 *
 * Usage:
 *   import Badge from '@/components/ui/Badge';
 *   <Badge variant="success">Completed</Badge>
 *   <Badge variant="warning" dot>Pending</Badge>
 */

import { clsx } from 'clsx';

const VARIANTS = {
  default: 'bg-zinc-100   text-zinc-600  border-zinc-200',
  success: 'bg-green-50   text-green-700 border-green-200',
  warning: 'bg-amber-50   text-amber-700 border-amber-200',
  error:   'bg-red-50     text-red-700   border-red-200',
  info:    'bg-blue-50    text-blue-700  border-blue-200',
  accent:  'bg-orange-50  text-orange-700 border-orange-200',
};

const DOT_COLOURS = {
  default: 'bg-zinc-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  accent:  'bg-orange-500',
};

/**
 * @param {{ variant?: keyof typeof VARIANTS, dot?: boolean,
 *            className?: string, children: React.ReactNode }} props
 */
export default function Badge({ variant = 'default', dot = false, className, children, ...props }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'text-xs font-medium rounded border leading-none',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_COLOURS[variant])} />
      )}
      {children}
    </span>
  );
}
