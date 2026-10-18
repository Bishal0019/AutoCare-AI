/**
 * Sign-in page — AutoCare AI
 *
 * The [[...sign-in]] catch-all segment is required by Clerk to handle
 * multi-step auth flows (e.g. email verification redirects). Without it,
 * Clerk's redirect-back mechanism breaks.
 *
 * Appearance: colours aligned with the design system via Clerk's
 * `variables` API. Orange primary (accent) matches our CTA colour.
 */

import { SignIn } from '@clerk/nextjs';

/** Clerk appearance matching the AutoCare AI design system */
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#F97316',                 // --color-accent
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorText: '#09090B',                    // --text-1
    colorTextSecondary: '#52525B',           // --text-2
    colorInputText: '#09090B',
    colorNeutral: '#18181B',
    borderRadius: '0.375rem',               // rounded-md
    fontFamily: 'inherit',
    fontSize: '14px',
  },
  elements: {
    card: 'shadow-sm border border-zinc-200 !bg-white',
    headerTitle: '!text-zinc-950 !font-semibold',
    headerSubtitle: '!text-zinc-500',
    socialButtonsBlockButton: '!border-zinc-200 hover:!bg-zinc-50',
    formFieldInput:
      '!border-zinc-300 !text-zinc-900 !bg-white hover:!border-zinc-400 ' +
      'focus:!border-zinc-900 !text-sm !rounded-md',
    formFieldLabel: '!text-zinc-700 !text-sm !font-medium',
    formButtonPrimary: '!bg-orange-500 hover:!bg-orange-600 !text-white !rounded-md',
    footerActionLink: '!text-orange-600 hover:!text-orange-700',
    identityPreviewEditButton: '!text-orange-600',
    dividerLine: '!bg-zinc-200',
    dividerText: '!text-zinc-400 !text-xs',
  },
};

export default function SignInPage() {
  return (
    <SignIn
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/dashboard"
      appearance={CLERK_APPEARANCE}
    />
  );
}
