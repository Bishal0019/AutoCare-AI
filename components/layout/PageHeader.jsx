/**
 * PageHeader — AutoCare AI design system
 *
 * Consistent top section for every authenticated page.
 * Provides a title, optional description, and an optional action slot
 * (usually a Button or Link-styled-as-button).
 *
 * Server Component — no interactivity needed here.
 *
 * Usage:
 *   import PageHeader from '@/components/layout/PageHeader';
 *
 *   <PageHeader
 *     title="Dashboard"
 *     description="Good morning — here's your vehicle status."
 *     action={<StartConversationButton />}
 *   />
 */

import { clsx } from 'clsx';

/**
 * @param {{
 *   title:        string,
 *   description?: string,
 *   action?:      React.ReactNode,
 *   className?:   string,
 *   border?:      boolean,   // show bottom border (default true)
 * }} props
 */
export default function PageHeader({
  title,
  description,
  action,
  className,
  border = true,
}) {
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 px-4 sm:px-8 pt-5 sm:pt-7 pb-5 sm:pb-6 bg-white',
        border && 'border-b border-zinc-200',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-zinc-950 tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{description}</p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">{action}</div>
      )}
    </div>
  );
}
