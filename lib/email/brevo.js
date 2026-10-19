/**
 * lib/email/brevo.js — Brevo Transactional Email API wrapper
 *
 * Uses a plain server-side fetch to POST to the Brevo v3 API.
 * No additional SDKs or dependencies are added.
 *
 * SECURITY:
 *   - BREVO_API_KEY is read only server-side (no NEXT_PUBLIC_ prefix).
 *   - This module must NEVER be imported from Client Components.
 *   - API key is never logged.
 *   - Recipient addresses are masked in success logs (e.g. j***@example.com).
 *
 * FAILURE BEHAVIOUR:
 *   - On a non-2xx Brevo response or a network error, sendEmail() logs
 *     the HTTP status, Brevo's error code, and Brevo's message string.
 *   - Returns { ok: false, error } — never throws.
 *   - Booking creation must never fail solely because the email provider
 *     is temporarily unavailable.
 *
 * RATE LIMITS:
 *   - Brevo free tier: 300 emails/day.
 *   - Brevo's HTTP 429 is logged and returned as { ok: false }.
 *   - No in-process retry — retries risk duplicate emails.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_NAME   = process.env.BREVO_SENDER_NAME ?? 'AutoCare AI';

/** Mask most characters in an email address for safe logging. */
export function maskEmail(addr) {
  if (!addr || typeof addr !== 'string') return '(empty)';
  const [local, domain] = addr.split('@');
  if (!domain) return '(malformed)';
  // Keep first char of local part, mask the rest before @
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/**
 * Sends a transactional email via the Brevo API.
 *
 * @param {{
 *   to:      string,   // recipient email address
 *   subject: string,
 *   html:    string,   // HTML body
 *   text:    string,   // plain-text alternative
 * }} params
 * @returns {Promise<{ ok: boolean, messageId?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  /* ── Environment validation ──────────────────────────────────── */
  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey) {
    console.error('[email] ❌ BREVO_API_KEY is not set — skipping send');
    return { ok: false, error: 'BREVO_API_KEY not configured' };
  }
  if (!senderEmail) {
    console.error('[email] ❌ BREVO_SENDER_EMAIL is not set — skipping send');
    return { ok: false, error: 'BREVO_SENDER_EMAIL not configured' };
  }

  /* ── Recipient validation ────────────────────────────────────── *
   * Log the masked address and the reason so it is easy to spot
   * when the customer email was not resolved.
   */
  if (!to) {
    console.warn(`[email] ⚠️ Skipping "${subject}" — recipient address is null/undefined`);
    return { ok: false, error: 'Recipient address is null or undefined' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn(`[email] ⚠️ Skipping "${subject}" — invalid recipient address: ${maskEmail(to)}`);
    return { ok: false, error: `Invalid recipient address: ${maskEmail(to)}` };
  }

  const payload = {
    sender:      { name: SENDER_NAME, email: senderEmail },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    const res = await fetch(BREVO_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
        'api-key':      apiKey,   // NEVER log this value
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000), // Prevent hanging serverless execution
    });

    const responseBody = await res.json().catch(() => ({}));

    if (res.ok) {
      // Brevo returns { messageId: '<...@smtp-relay.mailin.fr>' } on success
      const messageId = responseBody?.messageId ?? null;
      console.log(
        `[email] ✅ Accepted by Brevo: "${subject}" → ${maskEmail(to)}` +
        (messageId ? ` | messageId: ${messageId}` : '')
      );
      return { ok: true, messageId };
    }

    // Non-2xx: log status, Brevo error code, and message without exposing credentials
    console.error(
      `[email] ❌ Brevo rejected (HTTP ${res.status}) sending "${subject}" → ${maskEmail(to)}` +
      ` | code: ${responseBody?.code ?? 'N/A'}` +
      ` | message: ${responseBody?.message ?? '(no message)'}`
    );
    return {
      ok:    false,
      error: `Brevo HTTP ${res.status}: ${responseBody?.message ?? 'unknown error'}`,
    };
  } catch (err) {
    console.error(`[email] ❌ Network/timeout error sending "${subject}":`, err.message);
    return { ok: false, error: err.message };
  }
}
