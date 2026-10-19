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

import { createClerkClient } from '@clerk/backend';
import { currentUser }       from '@clerk/nextjs/server';
import { connectDB }         from '@/lib/db/mongoose';
import User                  from '@/lib/db/models/User';
import Vehicle               from '@/lib/db/models/Vehicle';
import { sendEmail, maskEmail } from './brevo.js';
import {
  templateRequestReceived,
  templateBookingConfirmed,
  templateCancellation,
  templateRescheduled,
  templateAdminNotification,
} from './templates.js';

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

/* ── Shared: fetch Clerk user without depending on request headers ── */

async function fetchClerkUser(userId) {
  if (!userId) return null;

  // 1. Primary: Direct server-to-server call via CLERK_SECRET_KEY (no request headers needed)
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (secretKey) {
    try {
      const clerk = createClerkClient({ secretKey });
      const user = await clerk.users.getUser(userId);
      if (user) return user;
    } catch (err) {
      console.warn('[notify] Direct Clerk getUser failed for userId:', userId, '| error:', err.message);
    }
  }

  // 2. Fallback: currentUser() if request context is active
  try {
    return await currentUser();
  } catch (err) {
    console.warn('[notify] currentUser() fallback unavailable:', err.message);
    return null;
  }
}

/* ── Shared: resolve customer data from MongoDB + Clerk ──────────── *
 *
 * Queries MongoDB and Clerk in parallel with individual error guards
 * so that a failure in one source never suppresses the other.
 *
 * Returns:
 *   user          — MongoDB User document (may be null if profile not saved yet)
 *   vehicle       — MongoDB Vehicle document (may be null)
 *   resolvedEmail — the customer's email, from MongoDB or Clerk (never 'unknown')
 *   resolvedName  — the customer's display name, from MongoDB or Clerk
 *
 * Priority for email:
 *   1. user.email from MongoDB (explicitly saved in profile)
 *   2. Clerk primaryEmailAddress (verified at Clerk sign-up)
 *   3. First address in Clerk emailAddresses array
 *
 * Persistence:
 *   If the user has not yet created a MongoDB User document, one is
 *   automatically upserted with their Clerk identity to avoid future lookups.
 */
async function getCustomerData(userId) {
  try {
    await connectDB();

    // Query MongoDB User, Vehicle, and Clerk user with independent guards
    const [user, vehicle, clerkUser] = await Promise.all([
      User.findOne({ clerkId: userId }).lean().catch(err => {
        console.warn('[notify] MongoDB User lookup error:', err.message);
        return null;
      }),
      Vehicle.findOne({ clerkId: userId }).lean().catch(err => {
        console.warn('[notify] MongoDB Vehicle lookup error:', err.message);
        return null;
      }),
      fetchClerkUser(userId),
    ]);

    /* ── Resolve email ───────────────────────────────────────────── */
    let resolvedEmail = null;
    let emailSource = 'none';

    // 1. Check MongoDB User email
    if (user?.email && typeof user.email === 'string' && user.email.includes('@')) {
      resolvedEmail = user.email.trim().toLowerCase();
      emailSource = 'mongodb';
    }

    // 2. Check Clerk user email (primary or first)
    if (!resolvedEmail && clerkUser) {
      const primaryId = clerkUser.primaryEmailAddressId;
      const addresses = clerkUser.emailAddresses ?? [];
      const primary   = addresses.find(a => a.id === primaryId);
      const cand = primary?.emailAddress ?? addresses[0]?.emailAddress ?? null;
      if (cand && typeof cand === 'string' && cand.includes('@')) {
        resolvedEmail = cand.trim().toLowerCase();
        emailSource = 'clerk';
      }
    }

    // Privacy-safe diagnostics
    if (resolvedEmail) {
      console.log(`[notify] 👤 Customer email resolved: ${maskEmail(resolvedEmail)} (source: ${emailSource}) for userId: ${userId}`);
    } else {
      console.warn(
        `[notify] ⚠️ No email address resolved for userId: ${userId}` +
        ` | MongoDB user: ${user ? 'exists' : 'null'}` +
        ` | Clerk user: ${clerkUser ? 'found' : 'null'}`
      );
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
      resolvedName = resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer';
    }

    /* ── Auto-persist MongoDB User if missing ────────────────────── */
    if (!user && resolvedEmail && clerkUser) {
      User.findOneAndUpdate(
        { clerkId: userId },
        {
          $setOnInsert: {
            clerkId:           userId,
            email:             resolvedEmail,
            firstName:         clerkUser.firstName || '',
            lastName:          clerkUser.lastName  || '',
            preferredLanguage: 'en',
          },
        },
        { upsert: true, new: true }
      ).catch(err =>
        console.warn('[notify] Background MongoDB user auto-provision notice:', err.message)
      );
    }

    return { user, vehicle, resolvedEmail, resolvedName };
  } catch (err) {
    console.error('[notify] Unexpected error in getCustomerData:', err.message);
    return { user: null, vehicle: null, resolvedEmail: null, resolvedName: 'Customer' };
  }
}

/* ── Shared: REQ-XXXXXXXX from MongoDB _id ───────────────────────── */

function toRef(id) {
  return `REQ-${String(id).slice(-8).toUpperCase()}`;
}

/* ── Shared: fire both customer + admin emails ───────────────────── */

async function fireEmails(customerEmail, customerTemplate, adminEvent, adminData, skipReason = null) {
  const refId = adminData.referenceId ?? '(no ref)';
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const promises = [];

  // Customer email
  if (customerEmail) {
    console.log(`[notify] 📤 Dispatching customer email (${adminEvent}) for ${refId} → ${maskEmail(customerEmail)}`);
    promises.push(
      sendEmail({
        to:      customerEmail,
        subject: customerTemplate.subject,
        html:    customerTemplate.html,
        text:    customerTemplate.text,
      }).then(r => {
        if (r.ok) {
          console.log(`[notify] ✅ Customer email delivered to Brevo for ${refId} | messageId: ${r.messageId ?? 'ok'}`);
        } else {
          console.error(`[notify] ❌ Customer email rejected/failed for ${refId}: ${r.error}`);
        }
        return r;
      })
    );
  } else {
    const reasonText = skipReason ?? 'no valid address resolved';
    console.warn(`[notify] ⚠️ Customer email skipped for ${refId} — reason: ${reasonText}`);
  }

  // Admin notification
  if (adminEmail) {
    console.log(`[notify] 📤 Dispatching admin alert (${adminEvent}) for ${refId} → ${maskEmail(adminEmail)}`);
    const adminTpl = templateAdminNotification({ event: adminEvent, ...adminData });
    promises.push(
      sendEmail({
        to:      adminEmail,
        subject: adminTpl.subject,
        html:    adminTpl.html,
        text:    adminTpl.text,
      }).then(r => {
        if (r.ok) {
          console.log(`[notify] ✅ Admin alert delivered to Brevo for ${refId} | messageId: ${r.messageId ?? 'ok'}`);
        } else {
          console.error(`[notify] ❌ Admin alert rejected/failed for ${refId}: ${r.error}`);
        }
        return r;
      })
    );
  } else {
    console.log(`[notify] ℹ️ Admin alert skipped for ${refId} — ADMIN_NOTIFICATION_EMAIL not configured`);
  }

  // Await all email deliveries to complete before continuing
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

  // Determine whether customer email should be sent or skipped
  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  let custEmail = null;
  let skipReason = null;

  if (!emailNotificationsEnabled) {
    skipReason = 'customer opted out in profile preferences (emailNotifications: false)';
  } else if (!resolvedEmail) {
    skipReason = 'no valid email address resolved from MongoDB profile or Clerk identity';
  } else {
    custEmail = resolvedEmail;
  }

  return await fireEmails(
    custEmail,
    customerTpl,
    'new_booking',
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
    },
    skipReason
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

  // Determine whether customer email should be sent or skipped
  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  let custEmail = null;
  let skipReason = null;

  if (!emailNotificationsEnabled) {
    skipReason = 'customer opted out in profile preferences (emailNotifications: false)';
  } else if (!resolvedEmail) {
    skipReason = 'no valid email address resolved from MongoDB profile or Clerk identity';
  } else {
    custEmail = resolvedEmail;
  }

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

  return await fireEmails(
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
    },
    skipReason
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

  // Determine whether customer email should be sent or skipped
  const emailNotificationsEnabled = user?.preferences?.emailNotifications !== false;
  let custEmail = null;
  let skipReason = null;

  if (!emailNotificationsEnabled) {
    skipReason = 'customer opted out in profile preferences (emailNotifications: false)';
  } else if (!resolvedEmail) {
    skipReason = 'no valid email address resolved from MongoDB profile or Clerk identity';
  } else {
    custEmail = resolvedEmail;
  }

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

  return await fireEmails(
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
    },
    skipReason
  );
}
