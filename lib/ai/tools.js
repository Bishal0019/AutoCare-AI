/**
 * AutoCare AI — Tool Definitions & Execution
 *
 * ═══════════════════════════════════════════════════════════════
 * TOOL BOUNDARY DECISION
 * ═══════════════════════════════════════════════════════════════
 * Tools available: createServiceRequest, createCallbackRequest, escalateToHuman
 *
 * getServiceInformation was considered and intentionally omitted.
 * The full knowledge base is injected into the system prompt on every
 * request. A tool for the same information would create a redundant
 * lookup path and a risk of inconsistency between prompt and tool output.
 * If retrieval-augmented generation is needed in a later phase (large KB,
 * token efficiency), getServiceInformation is the right addition at that point.
 *
 * ═══════════════════════════════════════════════════════════════
 * DESIGN PRINCIPLES
 * ═══════════════════════════════════════════════════════════════
 * - Every tool is bound to the authenticated Clerk userId at call time.
 * - Tools validate their own inputs beyond Zod (business rules, date sanity).
 * - Success responses include enough detail for the AI to confirm naturally
 *   in conversation, without exposing DB implementation details.
 * - Error responses include a typed errorCode for logging and an
 *   errorMessage the AI can relay to the customer.
 * - The AI must not claim a request was created unless success: true.
 * - The AI must not call these tools except from the /api/chat route.
 *
 * ═══════════════════════════════════════════════════════════════
 * TOOL RESPONSE SHAPES
 * ═══════════════════════════════════════════════════════════════
 * Success:
 *   { success: true, referenceId, serviceType?, status, details, nextSteps }
 *
 * Error:
 *   { success: false, errorCode, errorMessage }
 *   errorCode: 'AUTH_MISSING' | 'VALIDATION_ERROR' | 'DB_ERROR'
 *   errorMessage: human-readable, safe to relay to customer
 *
 * ═══════════════════════════════════════════════════════════════
 * AUTHENTICATION
 * ═══════════════════════════════════════════════════════════════
 * userId is passed in at build time from the authenticated API route.
 * If userId is missing, all tools return AUTH_MISSING and no DB write
 * is attempted.
 *
 * This module is server-side only. Never import in Client Components.
 */

import { z } from 'zod';
import { connectDB } from '@/lib/db/mongoose';
import ServiceRequest from '@/lib/db/models/ServiceRequest';
import { TOOL_DEFINITIONS } from './tool-definitions.js';
import { notifyBookingCreated } from '@/lib/email/notify.js';

/* ── Convenience aliases ────────────────────────────────────────── */

/**
 * p(toolName, paramName) — returns the description for a parameter from the
 * authoritative TOOL_DEFINITIONS so that Zod .describe() strings are never
 * hand-maintained here.
 */
const p = (tool, param) => TOOL_DEFINITIONS[tool].params[param].description;

/* ── Input schemas (exported for independent testing) ──────────── */

/**
 * Zod schema for createServiceRequest input.
 * Descriptions sourced from tool-definitions.js — not duplicated here.
 * Zod-specific constraints (min/max lengths, regex) are defined here
 * because they are validation concerns, not semantic descriptions.
 */
export const createServiceRequestSchema = z.object({
  serviceType: z
    .string()
    .min(3, 'Service type must be at least 3 characters')
    .max(120, 'Service type must be 120 characters or fewer')
    .describe(p('createServiceRequest', 'serviceType')),

  vehicleDetails: z
    .string()
    .max(200)
    .optional()
    .describe(p('createServiceRequest', 'vehicleDetails')),

  preferredDate: z
    .string()
    .max(50)
    .optional()
    .describe(p('createServiceRequest', 'preferredDate')),

  preferredTime: z
    .string()
    .max(50)
    .optional()
    .describe(p('createServiceRequest', 'preferredTime')),

  additionalNotes: z
    .string()
    .max(500)
    .optional()
    .describe(p('createServiceRequest', 'additionalNotes')),
});

/**
 * Zod schema for createCallbackRequest input.
 * Descriptions from tool-definitions.js.
 */
export const createCallbackRequestSchema = z.object({
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(300, 'Reason must be 300 characters or fewer')
    .describe(p('createCallbackRequest', 'reason')),

  preferredTime: z
    .string()
    .max(100)
    .optional()
    .describe(p('createCallbackRequest', 'preferredTime')),
});

/**
 * Zod schema for escalateToHuman input.
 * Descriptions from tool-definitions.js.
 */
export const escalateToHumanSchema = z.object({
  reason: z
    .string()
    .min(3, 'Reason must be at least 3 characters')
    .max(300, 'Reason must be 300 characters or fewer')
    .describe(p('escalateToHuman', 'reason')),

  urgency: z
    .enum(['normal', 'urgent'])
    .default('normal')
    .describe(p('escalateToHuman', 'urgency')),

  conversationSummary: z
    .string()
    .max(500)
    .optional()
    .describe(p('escalateToHuman', 'conversationSummary')),
});


/* ── Internal helpers ───────────────────────────────────────────── */

/**
 * Generates a short, human-readable reference from a MongoDB ObjectId.
 * Format: "REQ-A1B2C3D4" — the last 8 hex characters, uppercase.
 * Not guaranteed globally unique but unique enough for customer reference.
 *
 * @param {import('mongoose').Types.ObjectId} id
 * @returns {string}
 */
function toReferenceId(id) {
  return `REQ-${id.toString().slice(-8).toUpperCase()}`;
}

/**
 * Shared error response for authentication failures.
 * Returns without attempting any DB operation.
 */
const AUTH_ERROR = {
  success: false,
  errorCode: 'AUTH_MISSING',
  errorMessage:
    'I was unable to verify your identity. Please sign in again and try once more. ' +
    'If the problem persists, call us directly at +91 20 2634 5678.',
};

/**
 * Constructs a DB error response from a caught exception.
 * Strips internal exception details before returning to the model.
 *
 * @param {string} toolName
 * @param {Error} err
 * @returns {{ success: false, errorCode: string, errorMessage: string }}
 */
function dbError(toolName, err) {
  console.error(`[Tool: ${toolName}]`, err.message);
  return {
    success: false,
    errorCode: 'DB_ERROR',
    errorMessage:
      'I was unable to save your request due to a system error. ' +
      'Please try again in a moment, or call us at +91 20 2634 5678.',
  };
}

/* ── Tool builder ───────────────────────────────────────────────── */

/**
 * Returns the tool set bound to the authenticated user.
 *
 * Call this inside the API route handler on every request so that userId
 * is always fresh from auth(). Never call at module load time.
 *
 * @param {string | null | undefined} userId — Clerk userId from auth()
 * @returns {Record<string, { description: string, inputSchema: ZodObject, execute: Function }>}
 */
export function buildTools(userId) {
  return {

    /* ══════════════════════════════════════════════════════════
       Tool 1 — createServiceRequest
       Purpose : Log a customer's vehicle service request after
                 they have explicitly confirmed the details.
       Auth    : Writes clerkId: userId to every document.
       DB      : Inserts one ServiceRequest document.
    ══════════════════════════════════════════════════════════ */

    createServiceRequest: {
      description: TOOL_DEFINITIONS.createServiceRequest.description,

      inputSchema: createServiceRequestSchema,

      execute: async ({
        serviceType,
        vehicleDetails,
        preferredDate,
        preferredTime,
        additionalNotes,
      }) => {
        if (!userId) return AUTH_ERROR;

        /* Business-rule validation (beyond Zod) */
        const trimmedType = serviceType.trim();
        if (trimmedType.length < 3) {
          return {
            success: false,
            errorCode: 'VALIDATION_ERROR',
            errorMessage: 'The service type you provided was too short. Could you clarify what service you need?',
          };
        }

        /* Parse preferredDate if it looks like YYYY-MM-DD */
        let scheduledDate = null;
        if (preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
          const d = new Date(preferredDate);
          scheduledDate = isNaN(d.getTime()) ? null : d;
        }

        /* Compose notes */
        const noteLines = [];
        if (vehicleDetails) noteLines.push(`Vehicle: ${vehicleDetails.trim()}`);
        if (additionalNotes) noteLines.push(additionalNotes.trim());
        const notes = noteLines.join('\n').slice(0, 1000);

        try {
          await connectDB();
          const doc = await ServiceRequest.create({
            clerkId:         userId,
            type:            trimmedType,
            status:          'pending',
            scheduledDate,
            scheduledTime:   preferredTime?.trim() ?? null,
            vehicleSnapshot: vehicleDetails?.trim() ?? null,
            notes,
          });

          /* Fire booking email — fire-and-forget, never blocks the tool response */
          notifyBookingCreated(userId, doc.toObject()).catch(err =>
            console.error('[Tool: createServiceRequest] Email error:', err.message)
          );

          /* Build a human-readable summary for the AI to use in its reply */
          const datePart = preferredDate
            ? ` for ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}`
            : '';

          return {
            success:     true,
            referenceId: toReferenceId(doc._id),
            serviceType: trimmedType,
            status:      'pending',
            details:     `${trimmedType}${datePart}`,
            nextSteps:
              'The service team will review the request and confirm the appointment ' +
              'via WhatsApp or phone. Reference: ' + toReferenceId(doc._id),
          };
        } catch (err) {
          return dbError('createServiceRequest', err);
        }
      },
    },

    /* ══════════════════════════════════════════════════════════
       Tool 2 — createCallbackRequest
       Purpose : Log a request for a staff member to call the
                 customer. Confirm preferred call time first.
       Auth    : Writes clerkId: userId.
       DB      : Inserts one ServiceRequest document (type: Callback).
    ══════════════════════════════════════════════════════════ */

    createCallbackRequest: {
      description: TOOL_DEFINITIONS.createCallbackRequest.description,

      inputSchema: createCallbackRequestSchema,

      execute: async ({ reason, preferredTime }) => {
        if (!userId) return AUTH_ERROR;

        const noteLines = [`Reason: ${reason.trim()}`];
        if (preferredTime) noteLines.push(`Preferred call time: ${preferredTime.trim()}`);

        try {
          await connectDB();
          const doc = await ServiceRequest.create({
            clerkId: userId,
            type:    'Callback Request',
            status:  'pending',
            notes:   noteLines.join('\n'),
          });

          /* Fire booking email — fire-and-forget */
          notifyBookingCreated(userId, doc.toObject()).catch(err =>
            console.error('[Tool: createCallbackRequest] Email error:', err.message)
          );

          const timePart = preferredTime
            ? ` at ${preferredTime}`
            : ' during business hours';

          return {
            success:   true,
            status:    'pending',
            nextSteps: `Our team will call you${timePart}. Business hours are Monday to Saturday, 8 AM to 7 PM.`,
          };
        } catch (err) {
          return dbError('createCallbackRequest', err);
        }
      },
    },

    /* ══════════════════════════════════════════════════════════
       Tool 3 — escalateToHuman
       Purpose : Flag the conversation for a human staff member.
                 Use immediately on escalation triggers — do not delay.
       Auth    : Writes clerkId: userId.
       DB      : Inserts one ServiceRequest document (type: Escalation).
    ══════════════════════════════════════════════════════════ */

    escalateToHuman: {
      description: TOOL_DEFINITIONS.escalateToHuman.description,

      inputSchema: escalateToHumanSchema,

      execute: async ({ reason, urgency, conversationSummary }) => {
        if (!userId) return AUTH_ERROR;

        const isUrgent = urgency === 'urgent';
        const typeLabel = isUrgent
          ? 'URGENT — Escalation Required'
          : 'Escalation — Human Follow-up Required';

        const noteLines = [`Reason: ${reason.trim()}`];
        if (urgency) noteLines.push(`Urgency: ${urgency}`);
        if (conversationSummary) noteLines.push(`Context: ${conversationSummary.trim()}`);

        try {
          await connectDB();
          const doc = await ServiceRequest.create({
            clerkId: userId,
            type:    typeLabel,
            status:  'pending',
            notes:   noteLines.join('\n').slice(0, 1000),
          });

          /* Fire booking email — fire-and-forget */
          notifyBookingCreated(userId, doc.toObject()).catch(err =>
            console.error('[Tool: escalateToHuman] Email error:', err.message)
          );

          return {
            success:   true,
            urgency,
            nextSteps:
              'This has been flagged for the service team. ' +
              'Someone will follow up with you shortly. ' +
              'For immediate assistance call +91 20 2634 5678.',
          };
        } catch (err) {
          return dbError('escalateToHuman', err);
        }
      },
    },

  };
}
