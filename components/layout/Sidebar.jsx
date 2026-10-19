'use client';

/**
 * Sidebar — AutoCare AI
 *
 * Renders as a fixed desktop sidebar on large screens (≥ lg / 1024 px).
 * On mobile the sidebar is hidden; MobileNav handles navigation instead.
 *
 * The nav content is defined once in NAV_ITEMS / SidebarContent and
 * re-used by MobileNav so the two are always in sync.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Car,
  MessageSquare,
  Mic,
  History,
  ClipboardList,
  UserCircle,
} from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/dashboard',        label: 'Dashboard',        Icon: LayoutDashboard },
  { href: '/session',          label: 'AI Chat',          Icon: MessageSquare   },
  { href: '/voice',            label: 'Voice Chat',       Icon: Mic             },
  { href: '/conversations',    label: 'Conversations',    Icon: History         },
  { href: '/vehicle',          label: 'My Vehicle',       Icon: Car             },
  { href: '/service-requests', label: 'Service Requests', Icon: ClipboardList   },
  { href: '/profile',          label: 'Profile',          Icon: UserCircle      },
];

export function NavItem({ href, label, Icon, onClick }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        'group flex items-center gap-2.5 px-3 h-9 rounded-md text-sm transition-colors duration-150',
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]',
      )}
    >
      <Icon
        className="w-4 h-4 flex-shrink-0"
        strokeWidth={active ? 2 : 1.5}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span className="ml-auto w-1 h-4 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
      )}
    </Link>
  );
}

/**
 * SidebarContent — the shared interior of the sidebar drawer.
 * Rendered inside both the fixed desktop sidebar and the mobile drawer.
 *
 * @param {{ onNavClick?: () => void }} props
 */
export function SidebarContent({ onNavClick }) {
  return (
    <>
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-zinc-800 flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white tracking-tight leading-none">AutoCare AI</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">Service Centre</p>
        </div>
      </div>

      {/* ── Primary navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onClick={onNavClick} />
        ))}
      </nav>

      {/* ── Start Conversation — always-visible primary CTA ── */}
      <div className="px-2 border-t border-zinc-800 pt-2 pb-2">
        <Link
          href="/session"
          onClick={onNavClick}
          className={clsx(
            'flex items-center gap-2.5 px-3 h-10 rounded-md text-sm font-medium',
            'bg-accent text-white hover:bg-accent-dark transition-colors duration-150',
          )}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          Start AI Chat
        </Link>
      </div>

      {/* ── User account (Clerk UserButton) ── */}
      <div className="px-3 pb-4 pt-1">
        <div className="flex items-center gap-3 px-2 h-10 rounded-md hover:bg-white/[0.06] transition-colors">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-6 h-6 rounded-full',
                userButtonPopoverCard: 'border border-zinc-200 shadow-md',
                userButtonPopoverActionButton: 'hover:bg-zinc-50 text-zinc-700',
                userButtonPopoverFooter: 'hidden',
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 leading-none truncate">Account</p>
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-none">Profile &amp; settings</p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Sidebar — Desktop-only fixed sidebar.
 * Hidden on screens narrower than lg (1024 px); MobileNav handles those.
 */
export default function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col bg-zinc-950 border-r border-zinc-800">
      <SidebarContent />
    </aside>
  );
}
