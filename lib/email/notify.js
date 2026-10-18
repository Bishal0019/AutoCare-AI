/**
 * lib/email/notify.js — high-level notification helpers
 *
 * Exports two functions used by API routes and tools after successful
 * DB writes:
 *
 *   notifyBookingCreated(userId, serviceRequestDoc)
 *     → customer: "request received" (pending) or "confirmed" (scheduled)
 *     → admin:    new booking notification
 *
 *   notifyStatusChanged(userId, serviceRequestDoc, previousStatus)
 *     → customer: cancellation or rescheduling email
 *     → admin:    cancellation or rescheduling notification
 *
 * EMAIL SOURCE — how the customer email is resolved (in priority order):
 *   1. MongoDB User document (email field, set when the user saves their profile).
 *   2. Clerk primaryEmailAddress — always populated because Clerk requires an
 *      email at sign-up. Used when the MongoDB User document has not been
 *      created yet (user booked before visiting the Profile page).
 *
 * ROOT CAUSE OF THE ORIGINAL BUG:
 *   getCustomerData() previously only queried MongoDB. Users who book without
 *   completing their profile have no MongoDB User document, so user was null,
 *   custEmail was undefined, fireEmails() skipped the customer send entirely,
 *   and the admin email showed "unknown" for the customer address.
 *
 * DESIGN:
 *   - Failures are logged but never thrown — a DB write must not be reported
 *     as failed because the email provider is unavailable.
 *   - Customer email is suppressed if the user has emailNotifications: false.
 *   - Admin email always fires when ADMIN_NOTIFICATION_EMAIL is set.
 *   - Both emails are fire-and-forget (awaited for logging, never rethrows).
 *
 * SERVER-SIDE ONLY. Never import in Client Components.
 */

import { currentUser }  from '@clerk/nextjs/server';
import { connectDB }    from '@/lib/db/mongoose';
import User             from '@/lib/db/models/User';
import Vehicle          from '@/lib/db/models/Vehicle';
import { sendEmail }    from './brevo.js';
import {
  templateRequestReceived,
  templateBookingConfirmed,
  templateCancellation,
  templateRescheduled,
  templateAdminNotification,
} from './templates.js';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

/* ── Shared: build vehicle label ─────────────────────────────────── */

function vehicleLabel(vehicle, snapshot) {
  if (vehicle) {
    const base = `${vehicle.year} ${vehicle.manufacturer} ${vehicle.model}`;
    return vehicle.registrationNumber ? `${base} (${vehicle.registrationNumber})` : base;
  }
  return snapshot ?? null;
}

/* ── Shared: format date for display ────────────────────────────── */

function fmtDate(date) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return String(date); }
}

/* ── Shared: resolve customer data from MongoDB + Clerk ──────────── *
 *
 * Queries MongoDB and Clerk in parallel for speed.
 *
 * Returns:
 *   user          — MongoDB User document (may be null if profile not saved yet)
 *   vehicle       — MongoDB Vehicle document (may be null)
 *   resolvedEmail — the customer's email, from MongoDB or Clerk (never 'unknown')
 *   resolvedName  — the customer's display name, from MongoDB or Clerk
 *
 * Priority for email:
 *   1. user.email from MongoDB (set by profile save, may be stale if Clerk
 *      email changed — acceptable for notification purposes)
 *   2. Clerk primaryEmailAddress (always populated at sign-up)
 *   3. First emailAddress in Clerk's array
 *   4. null  — only if Clerk also has no address (should never happen in practice)
 *
 * Priority for name:
 *   1. MongoDB firstName + lastName (user-supplied, most descriptive)
 *   2. Clerk firstName + lastName
 *   3. resolvedEmail (always non-null if a Clerk session exists)
 */
async function getCustomerData(userId) {
  try {
    await connectDB();

    // Run all three lookups in parallel
    const [user, vehicle, clerkUser] = await Promise.all([
      User.findOne({ clerkId: userId }).lean(),
      Vehicle.findOne({ clerkId: userId }).lean(),
      currentUser(),   // Clerk server-side — always available in API route context
    ]);

    /* ── Resolve email ───────────────────────────────────────────── */
    let resolvedEmail = user?.email || null;

    if (!resolvedEmail && clerkUser) {
      // Prefer the primary address; fall back to the first address in the list
      const primaryId = clerkUser.primaryEmailAddressId;
      const addresses = clerkUser.emailAddresses ?? [];
      const primary   = addresses.find(a => a.id === primaryId);
      resolvedEmail   = primary?.emailAddress
        ?? addresses[0]?.emailAddress
        ?? null;
    }

    if (!resolvedEmail) {
      // This should not happen for a valid Clerk session, but log clearly
      console.warn('[notify] No email address found for userId:', userId,
        '| MongoDB user:', user ? 'exists' : 'null',
        '| Clerk emailAddresses:', clerkUser?.emailAddresses?.length ?? 0);
    }

    /* ── Resolve display name ────────────────────────────────────── */
    let resolvedName = null;
    if (user) {
      resolvedName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    }
    if (!resolvedName && clerkUser) {
      resolvedName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
    }
    if (!resolvedName) {
      resolvedName = resolvedEmail ?? 'Customer';
    }

    return { user, vehicle, resolvedEmail, resolvedName };
  } catch (err) {
    console.error('[notify] Failed to fetch customer data for email:', err.message);
    return { user: null, vehicle: null, resolvedEmail: null, resolvedName: 'Customer' };
  }
}

/* ── Shared: REQ-XXXXXXXX from MongoDB _id ───────────────────────── */

function toRef(id) {
  return `REQ-${String(id).slice(-8).toUpperCase()}`;
}

/* ── Shared: fire both customer + admin emails ───────────────────── */

async function fireEmails(customerEmail, customerTemplate, adminEvent, adminData) {
  const promises = [];

  // Customer email — skip with a clear log when address is missing
  if (customerEmail) {
    promises.push(
      sendEmail({
        to:      customerEmail,
        subject: customerTemplate.subject,
        html:    customerTemplate.html,
        text:    customerTemplate.text,
      }).then(r => {
        if (!r.ok) console.warn('[notify] Customer email failed:', r.error);
      })
    );
  } else {
    // Log clearly so the absence of a customer email is visible in server logs
    console.warn('[notify] Customer email skipped — no valid address resolved for',
      adminData.referenceId ?? '(no ref)');
  }

  // Admin notification
  if (ADMIN_EMAIL) {
    const adminTpl = templateAdminNotification({ event: adminEvent, ...adminData });
    promises.push(
      sendEmail({
        to:      ADMIN_EMAIL,
        subject: adminTpl.subject,
        html:    adminTpl.html,
        text:    adminTpl.text,
      }).then(r => {
        if (!r.ok) console.warn('[notify] Admin email failed:', r.error);
      })
    );
  }

  // Fire-and-forget — never rejects
  await Promise.allSettled(promises);
}

/* ── Public: notifyBookingCreated ────────────────────────────────── */

/**
 * Called immediately after a new ServiceRequest document is saved.
 *
 * @param {string} userId — Clerk userId from auth()
 * @param {object} doc    — plain JS ServiceRequest object (from .toObject() or .lean())
 */
export async function notifyBookingCreated(userId, doc) {
  if (!userId || !doc) return;

  const { user, vehicle, resolvedEmail, resolvedName } = await getCustomerData(userId);

  const refId  = toRef(doc._id);
  const vLabel = vehicleLabel(vehicle, doc.vehicleSnapshot);

  const baseData = {
    referenceId:   refId,
    serviceType:   doc.type,
    vehicleLabel:  vLabel ?? 'N/A',
    scheduledDate: fmtDate(doc.scheduledDate),
    scheduledTime: doc.scheduledTime ?? null,
    bay:           doc.bay ?? null,
    notes:         doc.notes || null,
    status:        doc.status,
  };

  // Pick template based on actual status (usually 'pending' from tools)
  let customerTpl;
  if (doc.status === 'scheduled' || doc.status === 'in_progress') {
    customerTpl = templateBookingConfirmed({ customerName: resolvedName, ...baseData });
  } else {
    customerTpl = templateRequestReceived({ customerName: resolvedName, ...baseData });
  }

  // Suppress customer email only when explicitly opted out — NOT when email is missing
  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  const custEmail = emailNotificationsEnabled ? resolvedEmail : null;

  if (!emailNotificationsEnabled) {
    console.log('[notify] Customer email suppressed — emailNotifications disabled for', refId);
  }

  await fireEmails(
    custEmail,
    customerTpl,
    'new_booking',
    {
      referenceId:   refId,
      // Use resolvedEmail in admin body so it shows the real address, not 'unknown'
      customerName:  resolvedName,
      customerEmail: resolvedEmail ?? '(no address on record)',
      customerPhone: user?.phone || null,
      serviceType:   doc.type,
      vehicleLabel:  vLabel ?? 'N/A',
      scheduledDate: fmtDate(doc.scheduledDate),
      scheduledTime: doc.scheduledTime ?? null,
      bay:           doc.bay ?? null,
      status:        doc.status,
      notes:         doc.notes || null,
    }
  );
}

/* ── Public: notifyStatusChanged ─────────────────────────────────── */

/**
 * Called after a PATCH that changes status or reschedules an appointment.
 *
 * Sends emails only for meaningful transitions:
 *   any → 'cancelled'  : cancellation notification
 *   any → 'scheduled'  : confirmation (or reschedule if was already scheduled)
 *
 * @param {string} userId
 * @param {object} doc            — updated ServiceRequest (plain object)
 * @param {string} previousStatus — status before the PATCH
 */
export async function notifyStatusChanged(userId, doc, previousStatus) {
  if (!userId || !doc) return;

  const newStatus = doc.status;

  const isCancellation = newStatus === 'cancelled' && previousStatus !== 'cancelled';
  const isScheduling   = newStatus === 'scheduled';
  const isReschedule   = isScheduling && previousStatus === 'scheduled';

  if (!isCancellation && !isScheduling) return;

  const { user, vehicle, resolvedEmail, resolvedName } = await getCustomerData(userId);

  const refId  = toRef(doc._id);
  const vLabel = vehicleLabel(vehicle, doc.vehicleSnapshot);

  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  const custEmail = emailNotificationsEnabled ? resolvedEmail : null;

  let customerTpl;
  let adminEvent;

  if (isCancellation) {
    customerTpl = templateCancellation({
      customerName: resolvedName,
      referenceId:  refId,
      serviceType:  doc.type,
      vehicleLabel: vLabel ?? 'N/A',
    });
    adminEvent = 'cancellation';
  } else {
    customerTpl = templateBookingConfirmed({
      customerName:  resolvedName,
      referenceId:   refId,
      serviceType:   doc.type,
      vehicleLabel:  vLabel ?? 'N/A',
      scheduledDate: fmtDate(doc.scheduledDate),
      scheduledTime: doc.scheduledTime ?? null,
      bay:           doc.bay ?? null,
      isReschedule,
    });
    adminEvent = 'rescheduled';
  }

  await fireEmails(
    custEmail,
    customerTpl,
    adminEvent,
    {
      referenceId:   refId,
      customerName:  resolvedName,
      customerEmail: resolvedEmail ?? '(no address on record)',
      customerPhone: user?.phone || null,
      serviceType:   doc.type,
      vehicleLabel:  vLabel ?? 'N/A',
      scheduledDate: fmtDate(doc.scheduledDate),
      scheduledTime: doc.scheduledTime ?? null,
      bay:           doc.bay ?? null,
      status:        newStatus,
      notes:         doc.notes || null,
    }
  );
}

/* ── Public: notifyRescheduled ───────────────────────────────────── */

/**
 * Called after a customer reschedules an upcoming booking.
 * Fires for both 'pending' (preferred-date change) and 'scheduled'
 * (confirmed-slot change) statuses.
 *
 * Only called when the date or time actually changed — the PATCH route
 * guards against no-op reschedules before calling this function.
 *
 * @param {string} userId
 * @param {object} doc         — updated ServiceRequest (plain object)
 * @param {Date|null} prevDate — scheduledDate before the update
 * @param {string|null} prevTime — scheduledTime before the update
 */
export async function notifyRescheduled(userId, doc, prevDate, prevTime) {
  if (!userId || !doc) return;

  const { user, vehicle, resolvedEmail, resolvedName } = await getCustomerData(userId);

  const refId  = toRef(doc._id);
  const vLabel = vehicleLabel(vehicle, doc.vehicleSnapshot);

  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  const custEmail = emailNotificationsEnabled ? resolvedEmail : null;

  const customerTpl = templateRescheduled({
    customerName: resolvedName,
    referenceId:  refId,
    serviceType:  doc.type,
    vehicleLabel: vLabel ?? 'N/A',
    prevDate:     prevDate ? fmtDate(prevDate) : null,
    prevTime:     prevTime ?? null,
    newDate:      fmtDate(doc.scheduledDate),
    newTime:      doc.scheduledTime ?? null,
    status:       doc.status,
  });

  await fireEmails(
    custEmail,
    customerTpl,
    'rescheduled',
    {
      referenceId:   refId,
      customerName:  resolvedName,
      customerEmail: resolvedEmail ?? '(no address on record)',
      customerPhone: user?.phone || null,
      serviceType:   doc.type,
      vehicleLabel:  vLabel ?? 'N/A',
      scheduledDate: fmtDate(doc.scheduledDate),
      scheduledTime: doc.scheduledTime ?? null,
      bay:           doc.bay ?? null,
      status:        doc.status,
      notes:         doc.notes || null,
    }
  );
}
