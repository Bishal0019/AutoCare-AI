/**
 * (app) Layout — Authenticated application shell
 *
 * All routes inside app/(app)/ share this layout.
 *
 * Desktop (≥ lg / 1024 px):
 *   - Sidebar: position:fixed, w-60 (240 px), dark, always visible.
 *   - Main:    ml-60 block offset, full remaining width, no top padding.
 *
 * Mobile (< lg):
 *   - Sidebar:   hidden (display:none via hidden lg:flex on the <aside>).
 *                Takes ZERO layout space — it is position:fixed but hidden.
 *   - MobileNav: position:fixed header + position:fixed slide-out drawer.
 *                Also takes ZERO layout space — both elements are fixed.
 *   - Main:      full viewport width (no ml-*), pt-14 clears the 56px (h-14)
 *                fixed mobile header.
 *
 * IMPORTANT — why no outer flex row:
 *   The Sidebar is already position:fixed, so it never occupies flow space.
 *   The MobileNav renders only position:fixed elements on mobile.
 *   Neither component needs a flex sibling relationship with the main div.
 *   Wrapping all three in a flex row caused MobileNav to consume horizontal
 *   space as a flex item, leaving only a narrow strip for the main content.
 *
 * Server Component — Sidebar and MobileNav are Client Components; importing
 * them here creates the correct Server→Client boundary.
 */

import Sidebar   from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';

export default function AppLayout({ children }) {
  return (
    <>
      {/*
        Desktop sidebar — position:fixed, hidden on mobile.
        Out of normal document flow; main content uses ml-60 to compensate.
      */}
      <Sidebar />

      {/*
        Mobile nav — position:fixed header + position:fixed drawer overlay.
        Hidden on desktop (lg:hidden on the wrapper div hides even fixed
        children because display:none on a parent removes all descendants).
        Out of normal document flow; main content uses pt-14 to compensate.
      */}
      <MobileNav />

      {/*
        Main content area.
        • pt-14 lg:pt-0  — clears the 56px fixed mobile header on mobile;
                           zero extra top padding on desktop (PageHeader has its own).
        • lg:ml-60       — offsets the fixed sidebar on desktop only; zero margin on mobile.
        • min-h-screen   — ensures the background fills the viewport.
        • overflow-x-hidden — prevents any child from causing horizontal scroll.
      */}
      <div className="pt-14 lg:pt-0 lg:ml-60 min-h-screen flex flex-col overflow-x-hidden bg-zinc-50">
        {children}
      </div>
    </>
  );
}
