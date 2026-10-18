/**
 * AutoCare AI — Customer Context Builder
 *
 * Builds a minimal, privacy-respecting context string from the authenticated
 * user's profile and vehicle data. This context is injected into the AI
 * system prompt on every request.
 *
 * Rules:
 * - Only include fields relevant to the conversation.
 * - Never expose internal IDs (clerkId, MongoDB _id).
 * - Never expose email in the AI context (it is used internally only).
 * - Registration number is included so the AI can reference it IF asked,
 *   but the system prompt instructs it not to volunteer it.
 *
 * This module is server-side only — never import in Client Components.
 */

import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import Vehicle from '@/lib/db/models/Vehicle';

const LANG_LABELS = {
  en: 'English', hi: 'Hindi', bn: 'Bengali',
  ta: 'Tamil',  te: 'Telugu', mr: 'Marathi',
};
const FUEL_LABELS = {
  petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric',
  hybrid: 'Hybrid', cng: 'CNG',
};

/**
 * Returns a plain-text customer context block for the AI system prompt.
 * Returns null if no relevant profile data exists, so the AI knows not to
 * personalize the conversation.
 *
 * @param {string} userId — Clerk userId from auth()
 * @returns {Promise<string|null>}
 */
export async function buildCustomerContext(userId) {
  try {
    await connectDB();
    const [profile, vehicle] = await Promise.all([
      User.findOne({ clerkId: userId }).lean(),
      Vehicle.findOne({ clerkId: userId }).lean(),
    ]);

    const lines = [];

    // Name — primary personalisation field
    const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
    if (fullName) lines.push(`Customer name: ${fullName}`);

    // Phone — useful if the AI needs to confirm a callback
    if (profile?.phone) lines.push(`Phone: ${profile.phone}`);

    // Language preference — AI should respond in this language if set
    if (profile?.preferredLanguage && profile.preferredLanguage !== 'en') {
      lines.push(`Preferred language: ${LANG_LABELS[profile.preferredLanguage] ?? profile.preferredLanguage}`);
    }

    // Location — useful for directions or local context
    if (profile?.location?.city) {
      const loc = [profile.location.city, profile.location.country].filter(Boolean).join(', ');
      lines.push(`Location: ${loc}`);
    }

    // Vehicle — critical for service booking
    if (vehicle) {
      lines.push(
        `Registered vehicle: ${vehicle.year} ${vehicle.manufacturer} ${vehicle.model}`,
        `Fuel type: ${FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType}`,
        `Registration: ${vehicle.registrationNumber}`,
      );
    } else {
      lines.push('Registered vehicle: None on file');
    }

    return lines.length > 0 ? lines.join('\n') : null;
  } catch (err) {
    // Silently fail — the AI can still operate without customer context
    console.error('[buildCustomerContext] DB error:', err.message);
    return null;
  }
}

/**
 * Minimal context for the session page UI header — not for the AI.
 * Only returns safe display fields (no private data).
 *
 * @param {string} userId
 * @returns {Promise<{ firstName: string|null, vehicle: string|null }>}
 */
export async function getUIContext(userId) {
  try {
    await connectDB();
    const [profile, vehicle] = await Promise.all([
      User.findOne({ clerkId: userId }).select('firstName').lean(),
      Vehicle.findOne({ clerkId: userId }).select('manufacturer model year').lean(),
    ]);
    return {
      firstName: profile?.firstName ?? null,
      vehicle: vehicle
        ? `${vehicle.manufacturer} ${vehicle.model} (${vehicle.year})`
        : null,
    };
  } catch {
    return { firstName: null, vehicle: null };
  }
}
