'use client';

/**
 * MobileNav — AutoCare AI
 *
 * Provides the mobile navigation experience for screens narrower than lg
 * (< 1024 px). Hidden on desktop where the fixed Sidebar is shown instead.
 *
 * Structure:
 *   - A slim top header bar containing:
 *       • Hamburger menu button (opens drawer)
 *       • AutoCare AI branding
 *       • Clerk UserButton (compact account access)
 *   - A slide-out navigation drawer (off-canvas by default):
 *       • Full SidebarContent (all nav links, CTA, account section)
 *       • Close button inside the drawer
 *       • Semi-transparent backdrop behind the drawer
 *
 * Drawer close triggers:
 *   - Tapping the backdrop
 *   - Pressing Escape
 *   - Clicking any navigation link (via onNavClick callback)
 *   - Clicking the × close button
 *
 * Accessibility:
 *   - role="dialog" + aria-modal + aria-label on drawer
 *   - aria-expanded on the hamburger button
 *   - aria-hidden on the backdrop
 *   - Focus-visible styles via globals.css
 *   - body scroll lock while drawer is open (overflow-hidden on <html>)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, MessageSquare } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { SidebarContent } from './Sidebar';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef(null);
  const hamburgerRef = useRef(null);

  /* ── Auto-close drawer on navigation ───────────────────────────── */
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  /* ── Open / close helpers ──────────────────────────────────────── */
  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => setIsOpen(false), []);

  /* ── Escape key dismissal ──────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        close();
        // Return focus to the hamburger after closing
        hamburgerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  /* ── Body scroll lock ──────────────────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  /* ── Focus management: move focus into drawer when opened ────────── */
  useEffect(() => {
    if (isOpen) {
      // Small delay lets the CSS transition begin before we shift focus
      const id = setTimeout(() => {
        drawerRef.current?.querySelector('a, button')?.focus();
      }, 60);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  return (
    /* Visible only on mobile (< lg) */
    <div className="lg:hidden">

      {/* ── Mobile top header bar ──────────────────────────────────── */}
      {/*
        position:fixed inset-x-0 → spans the full viewport width on mobile.
        The parent lg:hidden wrapper applies display:none at lg+ which correctly
        removes this element from rendering even though it is position:fixed.
        z-30 keeps it below the drawer backdrop (z-40) and drawer (z-50).
      */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 h-14 px-4 bg-zinc-950 border-b border-zinc-800">

        {/* Hamburger */}
        <button
          ref={hamburgerRef}
          type="button"
          onClick={open}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          className="flex items-center justify-center w-9 h-9 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>

        {/* Branding */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-semibold text-white tracking-tight leading-none truncate">
            AutoCare AI
          </p>
        </div>

        {/* Compact Clerk UserButton */}
        <div className="flex-shrink-0">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7 rounded-full',
                userButtonPopoverCard: 'border border-zinc-200 shadow-md',
                userButtonPopoverActionButton: 'hover:bg-zinc-50 text-zinc-700',
                userButtonPopoverFooter: 'hidden',
              },
            }}
          />
        </div>
      </header>

      {/* ── Backdrop ───────────────────────────────────────────────── */}
      {/*
        Rendered at z-40 (below drawer at z-50).
        Uses pointer-events-none when closed so it never intercepts clicks.
      */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`
          fixed inset-0 z-40 bg-black/50
          transition-opacity duration-300 ease-in-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* ── Navigation drawer ──────────────────────────────────────── */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isOpen}
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-72 max-w-[85vw]
          bg-zinc-950 border-r border-zinc-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'}
        `}
      >
        {/* Drawer close button — sits in the top-right corner of the drawer */}
        <button
          type="button"
          onClick={close}
          aria-label="Close navigation menu"
          className="
            absolute top-3.5 right-3 z-10
            flex items-center justify-center w-8 h-8 rounded-md
            text-zinc-400 hover:text-white hover:bg-white/[0.08]
            transition-colors
          "
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        {/* Reuse the exact same sidebar content (logo, nav, CTA, account) */}
        <SidebarContent onNavClick={close} />
      </div>

    </div>
  );
}
