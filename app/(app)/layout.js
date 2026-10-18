/**
 * (app) Layout — Authenticated application shell
 *
 * All routes inside app/(app)/ share this layout:
 *   - Dark fixed sidebar (240px)
 *   - Light scrollable main area offset by sidebar width
 *
 * Server Component — sidebar is a Client Component imported here,
 * which creates the correct Server→Client boundary.
 *
 * TODO Phase 1: Wrap with <ClerkProvider> if not already at root level,
 *               and add auth guard (redirect to /sign-in if unauthenticated).
 */

import Sidebar from '@/components/layout/Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Fixed sidebar — 240px (w-60) */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
