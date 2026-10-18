/**
 * Landing page — AutoCare AI
 *
 * The public-facing entry point. Communicates the product value proposition
 * and routes visitors to sign-in or sign-up.
 *
 * Design intent:
 *  – Dark background (zinc-950) creates a premium, focused impression
 *  – Single orange accent colour used sparingly for maximum impact
 *  – Two-column layout on desktop: content left, app preview right
 *  – App preview is a static HTML mockup (no JS, no images needed)
 *  – Typography does the heavy lifting — no decorative gradients or glows
 *  – Feature strip below hero: icon + title + description, no cards
 *
 * Sign-in/sign-up routes (Phase 1 with Clerk):
 *   /sign-in  →  app/(auth)/sign-in/page.js
 *   /sign-up  →  app/(auth)/sign-up/page.js
 */

import Link from 'next/link';
import { Mic, ArrowRight, CheckCircle, Calendar, Shield, Clock } from 'lucide-react';

/* ─── Feature data ─── */

const FEATURES = [
  'Natural voice conversation',
  'Real-time appointment booking',
  'Complete service history',
  'Multi-vehicle support',
];

const HIGHLIGHTS = [
  {
    Icon: Mic,
    title: 'Voice-first interface',
    desc: 'Customers speak naturally — AutoCare AI understands intent and context without scripted menus or hold queues.',
  },
  {
    Icon: Calendar,
    title: 'Instant scheduling',
    desc: 'Appointments booked in real time, synced with your service calendar and bay availability.',
  },
  {
    Icon: Shield,
    title: 'Complete audit trail',
    desc: 'Every conversation, booking, and service record stored securely and accessible from the dashboard.',
  },
];

/* ─── App preview mockup ─── */
/* A static HTML representation of the dashboard — no images, no JS.        */
/* Communicates the product's information density and visual style.          */

function AppPreview() {
  return (
    /* Outer positioning wrapper — provides the ambient glow */
    <div className="relative">
      {/* Very subtle ambient glow — not a neon blast, just warmth */}
      <div
        className="absolute -inset-8 rounded-3xl opacity-30"
        style={{ background: 'radial-gradient(ellipse at center, #F9731620 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Simulated browser chrome */}
      <div className="relative rounded-xl border border-white/10 shadow-xl overflow-hidden bg-zinc-900">

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 h-9 bg-zinc-800 border-b border-white/[0.06]">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          </div>
          {/* Fake URL bar */}
          <div className="flex-1 mx-3">
            <div className="max-w-[180px] mx-auto h-5 bg-zinc-700/70 rounded flex items-center justify-center">
              <span className="text-[10px] text-zinc-500 font-mono">autocare-ai.app/dashboard</span>
            </div>
          </div>
        </div>

        {/* App shell */}
        <div className="flex h-[280px] bg-zinc-50 overflow-hidden">

          {/* Dark sidebar strip */}
          <div className="w-11 bg-zinc-950 flex flex-col items-center py-3 gap-3 flex-shrink-0 border-r border-zinc-800">
            {/* Logo mark */}
            <div className="w-7 h-7 rounded-md bg-orange-500 flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-white/80" />
            </div>
            {/* Nav items */}
            <div className="flex flex-col gap-1.5 mt-1">
              {[true, false, false, false].map((active, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-md flex items-center justify-center
                    ${active ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}
                >
                  <div className={`w-3 h-2.5 rounded-sm ${active ? 'bg-zinc-300' : 'bg-zinc-600'}`} />
                </div>
              ))}
            </div>
            {/* Spacer then CTA */}
            <div className="flex-1" />
            <div className="w-7 h-7 rounded-md bg-orange-500/90 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Page header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-zinc-200">
              <div>
                <div className="h-4 w-24 bg-zinc-900 rounded mb-1.5" />
                <div className="h-2.5 w-40 bg-zinc-200 rounded" />
              </div>
              {/* CTA button */}
              <div className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-orange-500">
                <div className="w-2 h-2 rounded-full bg-white/70" />
                <div className="h-2 w-20 bg-white/80 rounded" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex gap-4 p-4 overflow-hidden">

              {/* Left: service list */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                  <div className="h-6 w-20 rounded bg-white border border-zinc-200" />
                </div>
                {/* Table header */}
                <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
                  <div className="h-8 bg-zinc-50 border-b border-zinc-200 px-3 flex items-center gap-3">
                    <div className="h-2 flex-1 bg-zinc-200 rounded" />
                    <div className="h-2 w-12 bg-zinc-200 rounded" />
                    <div className="h-2 w-14 bg-zinc-200 rounded" />
                  </div>
                  {/* Rows */}
                  {[
                    { dot: 'bg-blue-400',  status: 'bg-blue-100',  w: 'w-32' },
                    { dot: 'bg-green-400', status: 'bg-green-100', w: 'w-28' },
                    { dot: 'bg-green-400', status: 'bg-green-100', w: 'w-36' },
                    { dot: 'bg-amber-400', status: 'bg-amber-100', w: 'w-24' },
                  ].map(({ dot, status, w }, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 h-10 ${i < 3 ? 'border-b border-zinc-100' : ''}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                      <div className={`h-2 ${w} bg-zinc-200 rounded flex-1`} />
                      <div className="h-2 w-10 bg-zinc-200 rounded" />
                      <div className={`h-4 w-14 rounded ${status} border border-current/20`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: vehicle panel */}
              <div className="w-32 flex-shrink-0 space-y-3">
                <div className="rounded-md border border-zinc-200 p-3 bg-white">
                  <div className="h-2 w-16 bg-zinc-300 rounded mb-3" />
                  <div className="w-8 h-8 rounded-md bg-zinc-100 mb-2 flex items-center justify-center">
                    <div className="w-5 h-3 bg-zinc-300 rounded-sm" />
                  </div>
                  <div className="h-2.5 w-20 bg-zinc-800 rounded mb-1" />
                  <div className="h-2 w-16 bg-zinc-200 rounded mb-3" />
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="h-1.5 w-10 bg-zinc-200 rounded" />
                        <div className={`h-1.5 w-10 rounded ${i === 2 ? 'bg-orange-300' : 'bg-zinc-300'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
              <Mic className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">AutoCare AI</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href="/sign-in"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 h-9 flex items-center rounded-md hover:bg-white/[0.06]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-accent hover:bg-accent-dark text-white px-4 h-9 rounded-md transition-colors"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-12 xl:gap-20 items-center">

            {/* Content */}
            <div className="max-w-xl">

              {/* Status label */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-400 text-xs font-medium mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                AI voice customer support — now live
              </div>

              {/* Headline — deliberate typographic contrast */}
              <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.04] mb-6">
                Intelligent support
                <br />
                <span className="text-zinc-500">for every service visit.</span>
              </h1>

              <p className="text-lg text-zinc-400 leading-relaxed mb-10">
                AutoCare AI handles customer enquiries through natural voice
                conversation — booking appointments, answering service questions,
                and tracking vehicle history. No hold music, no scripts.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 mb-12">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium px-6 h-11 rounded-md transition-colors"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/[0.04] text-zinc-300 text-sm font-medium px-6 h-11 rounded-md transition-colors"
                >
                  Sign in to dashboard
                </Link>
              </div>

              {/* Feature list — 2-column, no card treatment */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-zinc-500">
                    <CheckCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* App preview — desktop only */}
            <div className="hidden lg:block">
              <AppPreview />
            </div>

          </div>
        </div>
      </section>

      {/* ── Highlights strip ── */}
      {/* Separated by a border, not a card. Information-first, not decorative. */}
      <section className="border-t border-white/[0.06] px-6 py-14 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto">

          <div className="grid md:grid-cols-3 gap-10">
            {HIGHLIGHTS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                {/* Icon in a contained square — not a floating orb */}
                <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
              <Mic className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs text-zinc-600 font-medium">AutoCare AI</span>
          </div>
          <p className="text-xs text-zinc-700">
            AIML Capstone Project · IIT Patna · 2026
          </p>
        </div>
      </footer>

    </div>
  );
}
