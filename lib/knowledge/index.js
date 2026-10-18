/**
 * AutoCare Knowledge Base — Index
 *
 * This module aggregates all knowledge-base data and builds the formatted
 * context string that gets injected into the AI agent's system prompt.
 *
 * USAGE IN THE AI LAYER (Phase 3):
 *
 *   import { KNOWLEDGE_BASE_CONTEXT, getContextForTopic, getFAQsByCategory } from '@/lib/knowledge';
 *
 *   // Inject the full knowledge base into the AI system prompt:
 *   const systemPrompt = `${AI_BEHAVIOUR_INSTRUCTIONS}\n\n${KNOWLEDGE_BASE_CONTEXT}`;
 *
 *   // Or inject only a relevant section (for token-efficient retrieval):
 *   const context = getContextForTopic('pricing');
 *
 * AUTHORITY RULE (must be reflected in every AI system prompt):
 *   The AI must only state facts present in this knowledge base.
 *   If information is absent, the AI must say so and direct the customer
 *   to contact the service centre directly.
 *
 * This module is server-side only — never import in Client Components.
 */

import {
  BUSINESS,
  LOCATION,
  CONTACT,
  HOURS,
  SERVICES,
  PACKAGES,
  VEHICLE_COMPATIBILITY,
  POLICIES,
  FACILITIES,
} from './business.js';
import { FAQS } from './faqs.js';

/* ── Re-export everything for direct access ─────────────────────── */
export {
  BUSINESS,
  LOCATION,
  CONTACT,
  HOURS,
  SERVICES,
  PACKAGES,
  VEHICLE_COMPATIBILITY,
  POLICIES,
  FACILITIES,
  FAQS,
};

/* ── Section builders (plain-text fragments) ────────────────────── */

function buildHoursSection() {
  return `\
OPENING HOURS
  Monday – Saturday : ${HOURS.weekdays.display}
  Sunday            : ${HOURS.sunday.display} — ${HOURS.sunday.restriction}
  Public Holidays   : ${HOURS.publicHolidays}
  Note              : ${HOURS.lastEntry}
  Emergency         : ${HOURS.emergencyNote}`;
}

function buildLocationSection() {
  return `\
LOCATION & CONTACT
  Address   : ${LOCATION.address}, ${LOCATION.city} – ${LOCATION.pincode}, ${LOCATION.state}
  Landmark  : ${LOCATION.landmark}
  Directions: ${LOCATION.directions}
  Parking   : ${LOCATION.parking}

  Phone     : ${CONTACT.phone}
  WhatsApp  : ${CONTACT.whatsapp}  (fastest for queries)
  Email     : ${CONTACT.email}
  Bookings  : ${CONTACT.bookingEmail}
  Feedback  : ${CONTACT.complaintEmail}`;
}

function buildServicesSection() {
  const lines = SERVICES.map((s) => {
    const priceStr = s.variants
      ? s.variants.map((v) => {
          const p = v.price ?? v.labourPrice;
          if (typeof p === 'object') {
            return `    – ${v.name}: ${p.display ?? `₹${p.from}–₹${p.to}`}${v.note ? ` (${v.note})` : ''}`;
          }
          return `    – ${v.name}: ₹${p}${v.note ? ` (${v.note})` : ''}`;
        }).join('\n')
      : s.price
        ? `    Price: ${s.price.display ?? (s.price.from ? `₹${s.price.from}–₹${s.price.to}` : '')}`
        : '';

    return `  ${s.name} [${s.duration}]\n${priceStr || `    Price: ${s.price?.display ?? 'See variants above'}`}`;
  });

  return `SERVICES & PRICING\n${lines.join('\n\n')}`;
}

function buildPackagesSection() {
  const lines = PACKAGES.map((p) => (
    `  ${p.name} — ₹${p.price.toLocaleString('en-IN')}\n` +
    `    Validity: ${p.validity}\n` +
    `    Includes: ${p.inclusions.join('; ')}\n` +
    `    Best for: ${p.bestFor}` +
    (p.savings ? `\n    Savings: ${p.savings}` : '')
  ));
  return `ANNUAL MAINTENANCE PACKAGES\n${lines.join('\n\n')}`;
}

function buildVehiclesSection() {
  return `\
VEHICLE COMPATIBILITY
  Fully supported  : ${VEHICLE_COMPATIBILITY.fullySupported.join('; ')}
  Partially supported (routine services only, HV system excluded):
    ${VEHICLE_COMPATIBILITY.partiallySupported.join('\n    ')}
  Not supported    :
    ${VEHICLE_COMPATIBILITY.notSupported.join('\n    ')}
  Brands serviced  : ${VEHICLE_COMPATIBILITY.brandsCovered.join(', ')}
  Note             : ${VEHICLE_COMPATIBILITY.note}`;
}

function buildPoliciesSection() {
  const { appointments, warranty, walkIns, estimatesAndInvoices } = POLICIES;
  return `\
POLICIES
  Appointments
    ${appointments.summary}
    Advance notice : ${appointments.advanceNotice}
    Cancellation   : ${appointments.cancellation}
    Rescheduling   : ${appointments.rescheduling}
    No-show        : ${appointments.noShow}
    How to book    : ${appointments.howToBook}

  Walk-ins
    ${walkIns.policy}
    ${walkIns.recommendation}

  Estimates & Invoices
    ${estimatesAndInvoices.estimates}
    ${estimatesAndInvoices.invoices}
    Insurance: ${estimatesAndInvoices.insurance}

  Warranty
    Labour   : ${warranty.labour}
    Parts    : ${warranty.parts}
    Consumables: ${warranty.consumables}
    Void if  : ${warranty.voidConditions}`;
}

function buildFacilitiesSection() {
  const { paymentMethods } = FACILITIES;
  return `\
CUSTOMER FACILITIES & PAYMENT
  Waiting lounge  : ${FACILITIES.waitingLounge}
  Refreshments    : ${FACILITIES.refreshments}
  Wi-Fi           : ${FACILITIES.wifi}
  Ready alert     : ${FACILITIES.readyNotification}
  Courtesy car    : ${FACILITIES.courtesyCar}
  Appointment reminder: ${FACILITIES.reminders}

  Payment methods : ${paymentMethods.accepted.join(', ')}
  EMI             : ${paymentMethods.emi}
  Advance payment : ${paymentMethods.advance}
  Note            : ${paymentMethods.note}`;
}

function buildFAQSection() {
  const lines = FAQS.map((faq) => (
    `  Q: ${faq.question}\n  A: ${faq.answer}`
  ));
  return `FREQUENTLY ASKED QUESTIONS\n${lines.join('\n\n')}`;
}

/* ── Full knowledge-base context string ─────────────────────────── */

/**
 * Pre-built plain-text context block for AI system-prompt injection.
 *
 * Inject this as part of the system prompt so the AI has full knowledge
 * of the business without needing to make additional API calls.
 *
 * The authority notice at the top instructs the AI on how to use this data.
 */
export const KNOWLEDGE_BASE_CONTEXT = `\
════════════════════════════════════════════════════════════
AUTOCARE SERVICE CENTRE — BUSINESS KNOWLEDGE BASE
════════════════════════════════════════════════════════════

AUTHORITY NOTICE — READ BEFORE RESPONDING
  This document is the single authoritative source for all business-specific
  information about AutoCare Service Centre.

  Rules you MUST follow:
  1. Only state facts that are explicitly present in this document.
  2. Never invent, estimate, or guess pricing, hours, policies, or contact details.
  3. If a customer asks about something not covered here, say:
     "I don't have that information with me. Please contact us directly at
      +91 20 2634 5678 or WhatsApp +91 98765 43210 and our team will help you."
  4. Do not assume seasonal promotions, discounts, or special offers exist
     unless explicitly stated in this document.
  5. Prices shown are indicative ranges. Always note that a final quote
     is provided before any work begins.

════════════════════════════════════════════════════════════

BUSINESS: ${BUSINESS.name}
Tagline : ${BUSINESS.tagline}
Since   : ${BUSINESS.established}

${buildLocationSection()}

${buildHoursSection()}

${buildServicesSection()}

${buildPackagesSection()}

${buildVehiclesSection()}

${buildPoliciesSection()}

${buildFacilitiesSection()}

${buildFAQSection()}

════════════════════════════════════════════════════════════
END OF KNOWLEDGE BASE
════════════════════════════════════════════════════════════
`;

/* ── Utility: topic-scoped context (Phase 3 token efficiency) ─── */

const TOPIC_SECTIONS = {
  hours:      buildHoursSection,
  location:   buildLocationSection,
  contact:    buildLocationSection,
  services:   buildServicesSection,
  pricing:    buildServicesSection,
  packages:   buildPackagesSection,
  vehicles:   buildVehiclesSection,
  policies:   buildPoliciesSection,
  booking:    buildPoliciesSection,
  warranty:   buildPoliciesSection,
  facilities: buildFacilitiesSection,
  payment:    buildFacilitiesSection,
  faqs:       buildFAQSection,
};

/**
 * Returns the context string for a specific topic.
 * Useful for token-efficient context injection in Phase 3.
 *
 * @param {'hours'|'location'|'services'|'pricing'|'packages'|
 *         'vehicles'|'policies'|'booking'|'warranty'|'facilities'|
 *         'payment'|'faqs'|'full'} topic
 * @returns {string}
 */
export function getContextForTopic(topic) {
  if (topic === 'full') return KNOWLEDGE_BASE_CONTEXT;
  const builder = TOPIC_SECTIONS[topic];
  if (!builder) return KNOWLEDGE_BASE_CONTEXT; // Default to full if topic unknown
  return `${BUSINESS.name} — Knowledge Base\n\n${builder()}`;
}

/**
 * Returns FAQs filtered by category or tag keyword.
 * Used for structured FAQ lookup before falling back to the AI.
 *
 * @param {{ category?: string, tag?: string }} filter
 * @returns {Array}
 */
export function getFAQs({ category, tag } = {}) {
  return FAQS.filter((faq) => {
    if (category && faq.category !== category) return false;
    if (tag && !faq.tags.includes(tag.toLowerCase())) return false;
    return true;
  });
}

/**
 * Simple keyword-based FAQ lookup.
 * Returns up to `limit` FAQs whose tags overlap with words in the query.
 * Phase 3 will replace this with embedding-based retrieval.
 *
 * @param {string} query
 * @param {number} [limit=3]
 * @returns {Array}
 */
export function findRelevantFAQs(query, limit = 3) {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scored = FAQS.map((faq) => {
    const tagMatches = faq.tags.filter((t) =>
      words.some((w) => t.includes(w) || w.includes(t))
    ).length;
    const questionWords = faq.question.toLowerCase().split(/\s+/);
    const questionMatches = words.filter((w) =>
      questionWords.some((qw) => qw.includes(w) || w.includes(qw))
    ).length;
    return { faq, score: tagMatches * 2 + questionMatches };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.faq);
}
