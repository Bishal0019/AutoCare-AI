/**
 * (app) Layout — Authenticated application shell
 *
 * All routes inside app/(app)/ share this layout:
 *   Desktop (≥ lg / 1024 px):
 *     - Dark fixed sidebar (240px, w-60)
 *     - Light scrollable main area offset by sidebar width (ml-60)
 *
 *   Mobile (< lg):
 *     - MobileNav: sticky dark header + slide-out drawer
 *     - Main area uses the full viewport width (no left margin)
 *
 * Server Component — Sidebar and MobileNav are Client Components imported
 * here, which creates the correct Server→Client boundary.
 */

import Sidebar    from '@/components/layout/Sidebar';
import MobileNav  from '@/components/layout/MobileNav';

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">

      {/* Desktop: fixed sidebar (hidden on mobile via its own hidden lg:flex) */}
      <Sidebar />

      {/* Mobile: sticky header + slide-out drawer (hidden on desktop via lg:hidden) */}
      <MobileNav />

      {/*
        Main content area.
        Desktop: offset by sidebar width (lg:ml-60).
        Mobile: full width, no left margin.
        pt-0 on desktop (PageHeader already has top padding).
        On mobile the sticky MobileNav header is 56 px (h-14) and uses
        position:sticky so the content naturally follows — no extra pt needed.
      */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </div>

    </div>
  );
}
