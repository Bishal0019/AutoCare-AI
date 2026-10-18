/**
 * Vehicle model — AutoCare AI
 *
 * One vehicle per user for Phase 2. Multi-vehicle support (isPrimary flag,
 * vehicle list) is deferred to Phase 3.
 *
 * Authorization rule:
 *   ALL queries MUST include { clerkId: <userId from auth()> }.
 *   When updating: findOneAndUpdate({ _id: vehicleId, clerkId: userId }, ...)
 *   The clerkId filter prevents users from modifying other users' vehicles
 *   even if they somehow obtain a valid vehicleId.
 *
 * AI layer contract:
 *   GET /api/vehicles returns the user's vehicle for the AI agent to use
 *   as context when handling service enquiries (Phase 3+).
 */

import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    /** Owner — used as the authorization key in every query. */
    clerkId: {
      type: String,
      required: [true, 'clerkId is required'],
      index: true,
    },

    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required'],
      trim: true,
      maxlength: [50, 'Manufacturer must be 50 characters or fewer'],
    },

    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
      maxlength: [50, 'Model must be 50 characters or fewer'],
    },

    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1886, 'Year cannot be before 1886'],
    },

    /**
     * Stored uppercase (MH-12-AB-1234 format).
     * No uniqueness constraint — different users may legitimately share
     * a record if entering test data, and validation is the user's responsibility.
     */
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Registration number must be 20 characters or fewer'],
    },

    fuelType: {
      type: String,
      required: [true, 'Fuel type is required'],
      enum: {
        values: ['petrol', 'diesel', 'electric', 'hybrid', 'cng'],
        message: '{VALUE} is not a supported fuel type',
      },
    },
  },
  {
    timestamps: true,
    collection: 'vehicles',
  }
);

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
