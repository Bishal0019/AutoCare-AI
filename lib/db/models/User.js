/**
 * User model — AutoCare AI (updated Phase 2)
 *
 * Added: phone, preferredLanguage, location.
 * These fields are editable by the user on the /profile page.
 *
 * Authorization rule:
 *   ALL queries on this model must include { clerkId: <userId from auth()> }.
 *   Never accept a clerkId from client request input.
 */

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    /** Clerk user ID — authorization key for all related model queries. */
    clerkId: {
      type: String,
      required: [true, 'clerkId is required'],
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: [true, 'email is required'],
      lowercase: true,
      trim: true,
    },

    firstName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [50, 'First name must be 50 characters or fewer'],
    },

    lastName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [50, 'Last name must be 50 characters or fewer'],
    },

    /** Optional — validated as international phone format on input. */
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: [20, 'Phone number must be 20 characters or fewer'],
    },

    /**
     * IETF language tag. Controls the AI agent's response language in Phase 3+.
     * Supported: en, hi, bn, ta, te, mr
     */
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'bn', 'ta', 'te', 'mr'],
      default: 'en',
    },

    /** Coarse location — used to contextualise service centre information. */
    location: {
      city:    { type: String, default: '', trim: true, maxlength: 100 },
      country: { type: String, default: '', trim: true, maxlength: 100 },
    },

    onboardingComplete: {
      type: Boolean,
      default: false,
    },

    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications:   { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

UserSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.email;
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
