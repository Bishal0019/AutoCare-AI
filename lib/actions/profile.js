'use server';

/**
 * Profile Server Actions — AutoCare AI
 *
 * Called by ProfileForm (Client Component) via React's form action mechanism.
 * Runs on the server — never exposed to the client bundle.
 *
 * Security:
 *   userId always comes from Clerk's auth() — never from formData.
 *   The $set includes clerkId to enforce ownership on upsert.
 *
 * AI layer:
 *   After save, revalidatePath('/profile') + revalidatePath('/dashboard') are
 *   included in the same response round-trip (Next.js 16 single-response model).
 *   GET /api/profile reads this data for the AI agent in Phase 3+.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';

/* ── Constants ────────────────────────────────────────────────── */

const SUPPORTED_LANGUAGES = ['en', 'hi', 'bn', 'ta', 'te', 'mr'];

/* ── Validation ───────────────────────────────────────────────── */

function validateProfile(data) {
  const errors = {};

  if (!data.firstName) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length > 50) {
    errors.firstName = 'Must be 50 characters or fewer';
  }

  if (!data.lastName) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length > 50) {
    errors.lastName = 'Must be 50 characters or fewer';
  }

  if (data.phone && !/^[+]?[0-9\s\-().]{7,20}$/.test(data.phone)) {
    errors.phone = 'Enter a valid phone number (e.g. +91 98765 43210)';
  }

  if (data.preferredLanguage && !SUPPORTED_LANGUAGES.includes(data.preferredLanguage)) {
    errors.preferredLanguage = 'Select a valid language';
  }

  if (data.city && data.city.length > 100) {
    errors.city = 'Must be 100 characters or fewer';
  }

  if (data.country && data.country.length > 100) {
    errors.country = 'Must be 100 characters or fewer';
  }

  return errors;
}

/* ── Action ───────────────────────────────────────────────────── */

/**
 * Creates or updates the authenticated user's profile in MongoDB.
 * Compatible with React 19's useActionState — signature: (prevState, formData).
 *
 * @param {object|null} _prevState - Previous action state (ignored)
 * @param {FormData}    formData
 * @returns {{ success: boolean, message?: string, error?: string, errors?: object }}
 */
export async function upsertProfile(_prevState, formData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be signed in to update your profile.' };
    }

    const raw = {
      firstName:         (formData.get('firstName')         ?? '').trim(),
      lastName:          (formData.get('lastName')          ?? '').trim(),
      phone:             (formData.get('phone')             ?? '').trim(),
      preferredLanguage: (formData.get('preferredLanguage') ?? 'en').trim(),
      city:              (formData.get('city')              ?? '').trim(),
      country:           (formData.get('country')           ?? '').trim(),
    };

    const errors = validateProfile(raw);
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    // Email comes from Clerk — authoritative, not user-supplied
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';

    await connectDB();

    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $set: {
          clerkId:           userId,
          email,
          firstName:         raw.firstName,
          lastName:          raw.lastName,
          phone:             raw.phone,
          preferredLanguage: raw.preferredLanguage,
          'location.city':   raw.city,
          'location.country':raw.country,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // revalidatePath triggers a re-render in the same response round-trip
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return { success: true, message: 'Profile saved.' };
  } catch (err) {
    console.error('[upsertProfile]', err);
    return { success: false, error: 'Could not save your profile. Please try again.' };
  }
}
