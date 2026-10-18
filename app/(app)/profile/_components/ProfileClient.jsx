'use client';

/**
 * ProfileClient — AutoCare AI
 *
 * Client component managing the profile page's view/edit modes.
 *
 * Props:
 *   profile    – serialized MongoDB User document or null (first-time)
 *   clerkEmail – email from Clerk (read-only, displayed but not editable here)
 *   clerkImage – Clerk avatar URL
 *
 * State flow:
 *   isEditing=false → view mode (clean label/value layout)
 *   isEditing=true  → form mode (Input/Select fields with Server Action)
 *
 * After a successful save, revalidatePath in the Server Action causes
 * the parent Server Component to re-render in the same response,
 * passing updated props. The form key changes → form remounts with new defaultValues.
 */

import { useActionState, useState } from 'react';
import { Pencil, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { upsertProfile } from '@/lib/actions/profile';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { buttonClass } from '@/components/ui/Button';

/* ── Constants ────────────────────────────────────────────────── */

const LANGUAGES = [
  { value: 'en', label: 'English'  },
  { value: 'hi', label: 'Hindi'    },
  { value: 'bn', label: 'Bengali'  },
  { value: 'ta', label: 'Tamil'    },
  { value: 'te', label: 'Telugu'   },
  { value: 'mr', label: 'Marathi'  },
];

const LANGUAGE_LABELS = Object.fromEntries(LANGUAGES.map((l) => [l.value, l.label]));

/* ── Sub-components ───────────────────────────────────────────── */

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-zinc-200" aria-hidden="true" />
    </div>
  );
}

/** View-mode label/value row. */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-start py-2.5 border-b border-zinc-100 last:border-0">
      <dt className="w-40 text-sm text-zinc-500 flex-shrink-0 pt-px">{label}</dt>
      <dd className={clsx('text-sm flex-1', value ? 'text-zinc-900' : 'text-zinc-400 italic')}>
        {value || 'Not set'}
      </dd>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function ProfileClient({ profile, clerkEmail, clerkImage }) {
  // editingOverride: null = unset, true = user clicked Edit, false = user clicked Cancel
  const [editingOverride, setEditingOverride] = useState(null);
  const [state, formAction, pending] = useActionState(upsertProfile, null);

  // isEditing derivation (no useEffect needed):
  //   • First-time (no profile name): always start editing
  //   • After a successful save: force view mode regardless of override
  //   • Otherwise: respect the user's manual toggle
  const noProfile = !profile?.firstName;
  const isEditing = state?.success
    ? false
    : editingOverride !== null
      ? editingOverride
      : noProfile;

  const p = profile ?? {};
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
  const langLabel = LANGUAGE_LABELS[p.preferredLanguage] ?? 'English';

  return (
    <div className="min-w-0">

      {/* ── Section header with edit toggle ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-zinc-950 tracking-tight">
            {isEditing
              ? (profile?.firstName ? 'Edit profile' : 'Complete your profile')
              : (fullName || 'Your profile')}
          </h1>
          {!isEditing && fullName && (
            <p className="text-sm text-zinc-500 mt-0.5">{clerkEmail}</p>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={() => setEditingOverride(true)}
            className={buttonClass('secondary', 'sm')}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* ── Global action feedback ── */}
      {state?.success && !isEditing && (
        <div className="flex items-center gap-2 mb-5 px-3.5 py-3 rounded-md bg-green-50 border border-green-100">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{state.message}</p>
        </div>
      )}
      {state?.error && (
        <div className="flex items-center gap-2 mb-5 px-3.5 py-3 rounded-md bg-red-50 border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* ════════════════════════════════
          VIEW MODE
          ════════════════════════════════ */}
      {!isEditing && (
        <div className="space-y-6">

          <section>
            <SectionHeader title="Personal Information" />
            <dl>
              <InfoRow label="Full name"   value={fullName} />
              <InfoRow label="Phone"        value={p.phone} />
              <InfoRow label="Language"     value={langLabel} />
            </dl>
          </section>

          <section>
            <SectionHeader title="Location" />
            <dl>
              <InfoRow label="City"         value={p.location?.city} />
              <InfoRow label="Country"      value={p.location?.country} />
            </dl>
          </section>

        </div>
      )}

      {/* ════════════════════════════════
          EDIT MODE
          ════════════════════════════════ */}
      {isEditing && (
        /* key = updatedAt ensures form remounts with fresh defaultValues
           after revalidatePath passes new props from the Server Component */
        <form
          key={p.updatedAt ?? 'new'}
          action={formAction}
          className="space-y-6"
          noValidate
        >

          {/* Personal information */}
          <section>
            <SectionHeader title="Personal Information" />
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="firstName"
                  label="First name"
                  placeholder="e.g. Bishal"
                  autoComplete="given-name"
                  defaultValue={p.firstName}
                  error={state?.errors?.firstName}
                  required
                />
                <Input
                  name="lastName"
                  label="Last name"
                  placeholder="e.g. Kumar"
                  autoComplete="family-name"
                  defaultValue={p.lastName}
                  error={state?.errors?.lastName}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="phone"
                  label="Phone number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  defaultValue={p.phone}
                  error={state?.errors?.phone}
                  hint="Optional — for service appointment reminders"
                />
                <Select
                  name="preferredLanguage"
                  label="Preferred language"
                  options={LANGUAGES}
                  defaultValue={p.preferredLanguage ?? 'en'}
                  error={state?.errors?.preferredLanguage}
                  hint="Used by the AI agent when responding to you"
                />
              </div>

              {/* Email — read-only, managed by Clerk */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700 leading-none">
                  Email address
                </label>
                <div className="h-9 flex items-center px-3 rounded-md border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 select-all">
                  {clerkEmail}
                </div>
                <p className="text-xs text-zinc-400">
                  Email is managed via your Clerk account and cannot be changed here.
                </p>
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <SectionHeader title="Location" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                name="city"
                label="City"
                placeholder="e.g. Mumbai"
                autoComplete="address-level2"
                defaultValue={p.location?.city}
                error={state?.errors?.city}
              />
              <Input
                name="country"
                label="Country"
                placeholder="e.g. India"
                autoComplete="country-name"
                defaultValue={p.location?.country}
                error={state?.errors?.country}
              />
            </div>
          </section>

          {/* Form actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass('accent', 'md')}
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>

            {profile?.firstName && (
              <button
                type="button"
                onClick={() => setEditingOverride(false)}
                disabled={pending}
                className={buttonClass('ghost', 'md')}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>

        </form>
      )}

    </div>
  );
}
