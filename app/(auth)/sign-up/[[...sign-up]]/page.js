/**
 * Sign-up page — AutoCare AI
 *
 * The [[...sign-up]] catch-all segment handles all Clerk sign-up steps:
 * initial form, email verification, optional profile completion, etc.
 *
 * After sign-up: user lands on /dashboard.
 * Phase 2 will add an /onboarding route for vehicle profile setup,
 * at which point NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL → /onboarding.
 */

import { SignUp } from '@clerk/nextjs';

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#F97316',
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorText: '#09090B',
    colorTextSecondary: '#52525B',
    colorInputText: '#09090B',
    colorNeutral: '#18181B',
    borderRadius: '0.375rem',
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

export default function SignUpPage() {
  return (
    <SignUp
      signInUrl="/sign-in"
      fallbackRedirectUrl="/dashboard"
      appearance={CLERK_APPEARANCE}
    />
  );
}
