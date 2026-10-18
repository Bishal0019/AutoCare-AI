/**
 * proxy.js — AutoCare AI
 *
 * Next.js 16 renamed "Middleware" to "Proxy". The functionality is identical;
 * only the file name changed (middleware.js → proxy.js).
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Protects all application routes. Public routes are explicitly listed;
 * everything else requires an authenticated Clerk session.
 *
 * When an unauthenticated user hits a protected route, Clerk redirects to
 * NEXT_PUBLIC_CLERK_SIGN_IN_URL (set in .env.local).
 *
 * Authorization contract:
 *   This file handles AUTHENTICATION only (is the session valid?).
 *   AUTHORIZATION (can this user access this specific record?) is enforced
 *   at the data-access layer in lib/db/ — every query filters by clerkId
 *   obtained from auth(). Never trust a userId from client request bodies.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',                    // landing page
  '/sign-in(.*)',         // Clerk catch-all sign-in flow
  '/sign-up(.*)',         // Clerk catch-all sign-up flow
  '/api/webhooks(.*)',    // Clerk webhooks — verified by signature, not session
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    // Redirects to sign-in when the session is absent or invalid.
    // Authorization checks happen per-query in lib/db/, not here.
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte?|ttf|woff2?|png|jpg|jpeg|gif|webp|svg|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
