/**
 * Button — AutoCare AI design system
 *
 * Variants:
 *   primary     — dark brand button (default actions)
 *   accent      — orange CTA button (primary product actions)
 *   secondary   — bordered button (secondary actions)
 *   ghost       — transparent button (tertiary / icon actions)
 *   destructive — red button (irreversible actions)
 *
 * Sizes:  sm | md (default) | lg
 *
 * Usage:
 *   import Button from '@/components/ui/Button';
 *   <Button variant="accent" size="lg">Start Conversation</Button>
 *
 * For navigation CTAs, wrap a Next.js <Link> with asChild-style passthrough:
 *   <Link href="/session" className={buttonClass('accent', 'md')}>...</Link>
 *   Or import the buttonClass helper directly.
 */

import { clsx } from 'clsx';

const BASE =
  'inline-flex items-center justify-center font-medium rounded-md ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--ring-brand)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const VARIANTS = {
  primary:
    'bg-brand text-white hover:bg-brand-hover active:bg-zinc-900',
  accent:
    'bg-accent text-white hover:bg-accent-dark active:bg-orange-700 ' +
    'focus-visible:shadow-[var(--ring-accent)]',
  secondary:
    'bg-white text-zinc-900 border border-zinc-200 ' +
    'hover:bg-zinc-50 hover:border-zinc-300 active:bg-zinc-100',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
    'focus-visible:shadow-[var(--ring-error)]',
};

const SIZES = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2.5',
};

/**
 * Returns class string for a button — useful when styling a <Link> as a button.
 * @param {keyof VARIANTS} variant
 * @param {keyof SIZES}    size
 * @param {string}         [extra]
 */
export function buttonClass(variant = 'primary', size = 'md', extra = '') {
  return clsx(BASE, VARIANTS[variant], SIZES[size], extra);
}

/**
 * @param {{ variant?: keyof typeof VARIANTS, size?: keyof typeof SIZES,
 *            className?: string, children: React.ReactNode }} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <button className={clsx(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}
