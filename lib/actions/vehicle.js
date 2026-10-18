'use server';

/**
 * Vehicle Server Actions — AutoCare AI
 *
 * Called by VehicleForm (Client Component).
 *
 * Authorization:
 *   On update: findOneAndUpdate({ _id: vehicleId, clerkId: userId })
 *   The clerkId filter ensures users can only modify their own vehicles,
 *   even if an attacker supplies a valid vehicleId belonging to someone else.
 *
 * AI layer:
 *   The vehicle data is served via GET /api/vehicles for the AI agent
 *   to use as context when handling service enquiries (Phase 3+).
 */

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/db/mongoose';
import Vehicle from '@/lib/db/models/Vehicle';

/* ── Constants ────────────────────────────────────────────────── */

const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'cng'];

/* ── Validation ───────────────────────────────────────────────── */

function validateVehicle(data) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  if (!data.manufacturer) {
    errors.manufacturer = 'Manufacturer is required';
  } else if (data.manufacturer.length > 50) {
    errors.manufacturer = 'Must be 50 characters or fewer';
  }

  if (!data.model) {
    errors.model = 'Model is required';
  } else if (data.model.length > 50) {
    errors.model = 'Must be 50 characters or fewer';
  }

  const year = parseInt(data.year, 10);
  if (!data.year || isNaN(year)) {
    errors.year = 'Year is required';
  } else if (year < 1886 || year > currentYear + 1) {
    errors.year = `Year must be between 1886 and ${currentYear + 1}`;
  }

  if (!data.registrationNumber) {
    errors.registrationNumber = 'Registration number is required';
  } else if (data.registrationNumber.length > 20) {
    errors.registrationNumber = 'Must be 20 characters or fewer';
  }

  if (!data.fuelType || !FUEL_TYPES.includes(data.fuelType)) {
    errors.fuelType = 'Select a fuel type';
  }

  return errors;
}

/* ── Action ───────────────────────────────────────────────────── */

/**
 * Creates or updates the authenticated user's vehicle.
 * If `vehicleId` is present in formData, performs an ownership-verified update.
 * Otherwise creates a new vehicle document.
 *
 * @param {object|null} _prevState
 * @param {FormData}    formData
 * @returns {{ success: boolean, message?: string, error?: string, errors?: object }}
 */
export async function upsertVehicle(_prevState, formData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be signed in.' };
    }

    const vehicleId = formData.get('vehicleId') || null;

    const raw = {
      manufacturer:       (formData.get('manufacturer')       ?? '').trim(),
      model:              (formData.get('model')              ?? '').trim(),
      year:               (formData.get('year')               ?? '').trim(),
      registrationNumber: (formData.get('registrationNumber') ?? '').trim().toUpperCase(),
      fuelType:            formData.get('fuelType')           ?? '',
    };

    const errors = validateVehicle(raw);
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    const payload = {
      manufacturer:       raw.manufacturer,
      model:              raw.model,
      year:               parseInt(raw.year, 10),
      registrationNumber: raw.registrationNumber,
      fuelType:           raw.fuelType,
    };

    await connectDB();

    if (vehicleId) {
      // Authorization: clerkId in query prevents cross-user modification
      const updated = await Vehicle.findOneAndUpdate(
        { _id: vehicleId, clerkId: userId },
        { $set: payload },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return { success: false, error: 'Vehicle not found or access denied.' };
      }
    } else {
      await Vehicle.create({ clerkId: userId, ...payload });
    }

    revalidatePath('/vehicle');
    revalidatePath('/dashboard');

    return { success: true, message: vehicleId ? 'Vehicle updated.' : 'Vehicle added.' };
  } catch (err) {
    console.error('[upsertVehicle]', err);
    return { success: false, error: 'Could not save vehicle. Please try again.' };
  }
}
