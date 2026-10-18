/**
 * lib/email/templates.js — HTML & plain-text email templates
 *
 * AutoCare AI branding: orange (#EA580C), black (#09090B), white (#FFFFFF).
 *
 * All templates accept a plain data object and return { subject, html, text }.
 * No template engine dependency — just tagged template literals.
 *
 * IMPORTANT:
 *   These templates deliberately avoid implying a confirmed appointment
 *   for pending bookings. Only use bookingConfirmation() when the booking
 *   status is 'scheduled' or 'in_progress'.
 */

/* ── Shared layout ───────────────────────────────────────────────── */

const ORANGE = '#EA580C';
const CONTACT_PHONE = '+91 20 2634 5678';
const CONTACT_HOURS = 'Mon–Sat, 8 AM – 7 PM';

/** Wraps content in a minimal responsive single-column shell. */
function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E4E4E7;">

          <!-- Header -->
          <tr>
            <td style="background:#09090B;padding:20px 28px;">
              <span style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:-0.3px;">
                AutoCare <span style="color:${ORANGE};">AI</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F4F4F5;padding:16px 28px;border-top:1px solid #E4E4E7;">
              <p style="margin:0;font-size:11px;color:#71717A;line-height:1.6;">
                AutoCare AI Service Centre &nbsp;|&nbsp; ${CONTACT_PHONE} &nbsp;|&nbsp; ${CONTACT_HOURS}<br/>
                This is an automated message. Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Minimal HTML-escape for user-controlled strings in email HTML. */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders a labeled detail row (used in info tables). */
function detailRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#71717A;width:140px;vertical-align:top;">${escHtml(label)}</td>
      <td style="padding:6px 0;font-size:13px;color:#09090B;font-weight:500;vertical-align:top;">${escHtml(value)}</td>
    </tr>`;
}

/** Styled badge inline-block. */
function badge(text, color = ORANGE) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color}1A;color:${color};font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;">${escHtml(text)}</span>`;
}

/* ── Template 1: Service Request Received (pending) ─────────────── */

/**
 * Customer email sent when a new request is created with status = 'pending'.
 * Deliberately does NOT say "appointment confirmed".
 *
 * @param {{
 *   customerName:    string,
 *   referenceId:     string,    // e.g. REQ-A1B2C3D4
 *   serviceType:     string,
 *   vehicleLabel:    string,    // e.g. "2019 Maruti Suzuki Swift (MH-12-AB-1234)"
 *   scheduledDate:   string | null,
 *   scheduledTime:   string | null,
 *   notes:           string | null,
 * }} data
 */
export function templateRequestReceived(data) {
  const {
    customerName, referenceId, serviceType,
    vehicleLabel, scheduledDate, scheduledTime, notes,
  } = data;

  const subject = `Service request received — ${referenceId}`;

  const html = layout(subject, `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#09090B;">Request received</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#71717A;">Hi ${escHtml(customerName || 'there')}, we've received your service request.</p>

    <div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#C2410C;font-weight:500;">
        ℹ️ Your request is <strong>pending review</strong>. Our team will confirm your appointment shortly.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      ${detailRow('Reference', referenceId)}
      ${detailRow('Service', serviceType)}
      ${detailRow('Vehicle', vehicleLabel)}
      ${detailRow('Preferred date', scheduledDate ?? null)}
      ${detailRow('Preferred time', scheduledTime ?? null)}
      ${notes ? detailRow('Notes', notes) : ''}
      ${detailRow('Status', 'Pending — awaiting confirmation')}
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#3F3F46;line-height:1.6;">
      Our service team will contact you via phone or WhatsApp to confirm the exact appointment time.
    </p>
    <p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;">
      For urgent queries, call us at <strong>${CONTACT_PHONE}</strong> (${CONTACT_HOURS}).
    </p>
  `);

  const text = `
Service request received — AutoCare AI
=======================================
Hi ${customerName || 'there'},

We have received your service request and it is currently pending review.
Our team will contact you to confirm the appointment.

Reference: ${referenceId}
Service:   ${serviceType}
Vehicle:   ${vehicleLabel ?? 'N/A'}
Date:      ${scheduledDate ?? 'Not specified'}
Time:      ${scheduledTime ?? 'Not specified'}
Status:    Pending — awaiting confirmation

Questions? Call ${CONTACT_PHONE} (${CONTACT_HOURS}).
  `.trim();

  return { subject, html, text };
}

/* ── Template 2: Booking Confirmed / Rescheduled ─────────────────── */

/**
 * Customer email for a scheduled or rescheduled appointment.
 *
 * @param {{
 *   customerName:  string,
 *   referenceId:   string,
 *   serviceType:   string,
 *   vehicleLabel:  string,
 *   scheduledDate: string,
 *   scheduledTime: string | null,
 *   bay:           string | null,
 *   isReschedule?: boolean,
 * }} data
 */
export function templateBookingConfirmed(data) {
  const {
    customerName, referenceId, serviceType,
    vehicleLabel, scheduledDate, scheduledTime, bay, isReschedule,
  } = data;

  const title = isReschedule ? 'Appointment rescheduled' : 'Appointment confirmed';
  const subject = `${title} — ${referenceId}`;

  const html = layout(subject, `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#09090B;">${escHtml(title)}</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#71717A;">Hi ${escHtml(customerName || 'there')}, your appointment has been ${isReschedule ? 'rescheduled' : 'confirmed'}.</p>

    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#15803D;font-weight:500;">
        ✅ Your appointment is <strong>confirmed</strong>. Please arrive 10 minutes early.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      ${detailRow('Reference', referenceId)}
      ${detailRow('Service', serviceType)}
      ${detailRow('Vehicle', vehicleLabel)}
      ${detailRow('Date', scheduledDate)}
      ${detailRow('Time', scheduledTime)}
      ${bay ? detailRow('Bay', bay) : ''}
      ${detailRow('Status', 'Scheduled')}
    </table>

    <p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;">
      Need to reschedule? Call <strong>${CONTACT_PHONE}</strong> (${CONTACT_HOURS}) at least 24 hours in advance.
    </p>
  `);

  const text = `
${title} — AutoCare AI
=======================================
Hi ${customerName || 'there'},

Your appointment has been ${isReschedule ? 'rescheduled' : 'confirmed'}.

Reference: ${referenceId}
Service:   ${serviceType}
Vehicle:   ${vehicleLabel ?? 'N/A'}
Date:      ${scheduledDate ?? 'N/A'}
Time:      ${scheduledTime ?? 'N/A'}
${bay ? `Bay:       ${bay}\n` : ''}Status:    Scheduled

To reschedule, call ${CONTACT_PHONE} (${CONTACT_HOURS}).
  `.trim();

  return { subject, html, text };
}

/* ── Template 3: Cancellation ────────────────────────────────────── */

/**
 * @param {{
 *   customerName: string,
 *   referenceId:  string,
 *   serviceType:  string,
 *   vehicleLabel: string,
 * }} data
 */
export function templateCancellation(data) {
  const { customerName, referenceId, serviceType, vehicleLabel } = data;

  const subject = `Service request cancelled — ${referenceId}`;

  const html = layout(subject, `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#09090B;">Request cancelled</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#71717A;">Hi ${escHtml(customerName || 'there')}, your service request has been cancelled.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      ${detailRow('Reference', referenceId)}
      ${detailRow('Service', serviceType)}
      ${detailRow('Vehicle', vehicleLabel)}
      ${detailRow('Status', 'Cancelled')}
    </table>

    <p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;">
      If you did not request this cancellation or would like to rebook, call us at
      <strong>${CONTACT_PHONE}</strong> (${CONTACT_HOURS}).
    </p>
  `);

  const text = `
Service request cancelled — AutoCare AI
=======================================
Hi ${customerName || 'there'},

Your service request has been cancelled.

Reference: ${referenceId}
Service:   ${serviceType}
Vehicle:   ${vehicleLabel ?? 'N/A'}
Status:    Cancelled

To rebook, call ${CONTACT_PHONE} (${CONTACT_HOURS}).
  `.trim();

  return { subject, html, text };
}

/* ── Template 5: Appointment Rescheduled (customer) ─────────────── */

/**
 * Customer email sent after a successful reschedule operation.
 * Shows both the previous and the new appointment date/time.
 * Appropriate for both pending (preferred-date change) and
 * scheduled (confirmed-slot change) bookings.
 *
 * @param {{
 *   customerName:  string,
 *   referenceId:   string,
 *   serviceType:   string,
 *   vehicleLabel:  string,
 *   prevDate:      string | null,   // formatted previous date
 *   prevTime:      string | null,   // previous time string
 *   newDate:       string | null,   // formatted new date
 *   newTime:       string | null,   // new time string
 *   status:        string,          // current booking status
 * }} data
 */
export function templateRescheduled(data) {
  const {
    customerName, referenceId, serviceType, vehicleLabel,
    prevDate, prevTime, newDate, newTime, status,
  } = data;

  const subject = `Your AutoCare AI Appointment Has Been Rescheduled — ${referenceId}`;

  const isConfirmed = status === 'scheduled';

  const html = layout(subject, `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#09090B;">Appointment rescheduled</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#71717A;">Hi ${escHtml(customerName || 'there')}, your appointment has been successfully rescheduled.</p>

    ${isConfirmed ? `
    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#15803D;font-weight:500;">
        ✅ Your new appointment is <strong>confirmed</strong>. Please arrive 10 minutes early.
      </p>
    </div>` : `
    <div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#C2410C;font-weight:500;">
        ℹ️ Your preferred date has been updated. Our team will confirm the new slot shortly.
      </p>
    </div>`}

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Previous appointment</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;background:#F4F4F5;border-radius:6px;padding:12px;">
      ${detailRow('Date', prevDate ?? 'Not set')}
      ${detailRow('Time', prevTime ?? 'Not set')}
    </table>

    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${ORANGE};text-transform:uppercase;letter-spacing:0.5px;">New appointment</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      ${detailRow('Reference', referenceId)}
      ${detailRow('Service', serviceType)}
      ${detailRow('Vehicle', vehicleLabel)}
      ${detailRow('Date', newDate ?? 'Not specified')}
      ${detailRow('Time', newTime ?? 'Not specified')}
      ${detailRow('Status', isConfirmed ? 'Scheduled' : 'Pending — awaiting confirmation')}
    </table>

    <p style="margin:0;font-size:13px;color:#3F3F46;line-height:1.6;">
      Need to make further changes? Call <strong>${CONTACT_PHONE}</strong> (${CONTACT_HOURS}) at least 24 hours in advance.
    </p>
  `);

  const text = `
Your AutoCare AI Appointment Has Been Rescheduled — ${referenceId}
=======================================
Hi ${customerName || 'there'},

Your appointment has been rescheduled.

Previous appointment:
  Date: ${prevDate ?? 'Not set'}
  Time: ${prevTime ?? 'Not set'}

New appointment:
  Reference: ${referenceId}
  Service:   ${serviceType}
  Vehicle:   ${vehicleLabel ?? 'N/A'}
  Date:      ${newDate ?? 'Not specified'}
  Time:      ${newTime ?? 'Not specified'}
  Status:    ${isConfirmed ? 'Scheduled' : 'Pending — awaiting confirmation'}

Questions? Call ${CONTACT_PHONE} (${CONTACT_HOURS}).
  `.trim();

  return { subject, html, text };
}

/* ── Template 4 (was 4, now 6): Admin notification ───────────────── */

/**
 * Internal admin notification — includes customer contact details.
 * Never sent to the customer.
 *
 * @param {{
 *   event:         'new_booking' | 'cancellation' | 'rescheduled',
 *   referenceId:   string,
 *   customerName:  string,
 *   customerEmail: string,
 *   customerPhone: string | null,
 *   serviceType:   string,
 *   vehicleLabel:  string,
 *   scheduledDate: string | null,
 *   scheduledTime: string | null,
 *   bay:           string | null,
 *   status:        string,
 *   notes:         string | null,
 * }} data
 */
export function templateAdminNotification(data) {
  const {
    event, referenceId, customerName, customerEmail, customerPhone,
    serviceType, vehicleLabel, scheduledDate, scheduledTime, bay,
    status, notes,
  } = data;

  const eventLabel = {
    new_booking:  'New Booking',
    cancellation: 'Cancellation',
    rescheduled:  'Rescheduled',
  }[event] ?? event;

  const subject = `[AutoCare AI] ${eventLabel} — ${referenceId}`;

  const html = layout(subject, `
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#09090B;">${escHtml(eventLabel)}</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#71717A;">Admin notification — do not forward to customer.</p>

    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#09090B;">Customer</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      ${detailRow('Name', customerName)}
      ${detailRow('Email', customerEmail)}
      ${customerPhone ? detailRow('Phone', customerPhone) : ''}
    </table>

    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#09090B;">Booking</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      ${detailRow('Reference', referenceId)}
      ${detailRow('Service', serviceType)}
      ${detailRow('Vehicle', vehicleLabel)}
      ${detailRow('Date', scheduledDate ?? null)}
      ${detailRow('Time', scheduledTime ?? null)}
      ${bay ? detailRow('Bay', bay) : ''}
      ${detailRow('Status', status)}
      ${notes ? detailRow('Notes', notes) : ''}
    </table>
  `);

  const text = `
[AutoCare AI] ${eventLabel} — ${referenceId}
=======================================
Customer: ${customerName} <${customerEmail}>${customerPhone ? `\nPhone: ${customerPhone}` : ''}

Reference: ${referenceId}
Service:   ${serviceType}
Vehicle:   ${vehicleLabel ?? 'N/A'}
Date:      ${scheduledDate ?? 'Not set'}
Time:      ${scheduledTime ?? 'Not set'}
${bay ? `Bay:       ${bay}\n` : ''}Status:    ${status}
${notes ? `Notes:     ${notes}` : ''}
  `.trim();

  return { subject, html, text };
}
