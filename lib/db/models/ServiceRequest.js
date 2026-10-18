/**
 * ServiceRequest model — AutoCare AI
 *
 * Stores customer service requests created through the AI conversation
 * or directly through the service-requests page.
 *
 * Authorization rule:
 *   ALL queries MUST include { clerkId: <userId from auth()> }.
 *
 * Status lifecycle:
 *   pending → scheduled → in_progress → completed
 *   Any status → cancelled
 */

import mongoose from 'mongoose';

const ServiceRequestSchema = new mongoose.Schema(
  {
    /** Owner — authorization key for every query. */
    clerkId: {
      type: String,
      required: [true, 'clerkId is required'],
      index: true,
    },

    /**
     * Human-readable service type.
     * Examples: "Oil & Filter Change", "Brake Inspection", "Tyre Rotation"
     * Set by the AI agent during conversation, or entered manually.
     */
    type: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true,
      maxlength: [120, 'Service type must be 120 characters or fewer'],
    },

    status: {
      type: String,
      enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    /** Set when the service centre confirms a booking slot. */
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, default: null, trim: true },   // e.g. "9:00 AM"
    bay:           { type: String, default: null, trim: true },   // e.g. "Bay 3"

    /** Optional notes from the customer or AI agent. */
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes must be 1,000 characters or fewer'],
    },

    /**
     * Vehicle details collected by the AI when the customer has no registered
     * vehicle profile. Free-text snapshot, e.g. "2019 Maruti Suzuki Swift Petrol".
     * Not authoritative — used for staff context only.
     */
    vehicleSnapshot: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Vehicle snapshot must be 200 characters or fewer'],
    },

    /**
     * Estimated cost in the user's local currency (numeric, no symbol).
     * Displayed as-is — formatting is done in the UI layer.
     */
    estimatedCost: { type: Number, default: null },

  },
  {
    timestamps: true,
    collection: 'service_requests',
  }
);

export default mongoose.models.ServiceRequest ||
  mongoose.model('ServiceRequest', ServiceRequestSchema);
