/**
 * lib/ai/tool-definitions.js — Authoritative tool metadata
 *
 * Single source of truth for all AutoCare AI tool names, descriptions,
 * and parameter schemas. Both the text agent (Vercel AI SDK / Zod format)
 * and the voice agent (Gemini Live / Google native format) derive their
 * declarations from this file.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────
 * The text and voice providers require different declaration formats:
 *   Text  — Vercel AI SDK:  { inputSchema: ZodObject, execute }
 *   Voice — Gemini Live:    { functionDeclarations: [{ name, description, parameters }] }
 *
 * Without this file, tool descriptions are hand-maintained in two places
 * and diverge silently. This file eliminates that by keeping every tool
 * name, description, and parameter description in one place.
 *
 * Format adapters that BUILD provider-specific shapes from this data:
 *   lib/ai/tools.js       — builds Zod schemas + execute (Vercel AI SDK)
 *   lib/ai/voice-tools.js — builds Google native declarations (Gemini Live)
 *
 * ─────────────────────────────────────────────────────────────────────
 * DATA SHAPE
 * ─────────────────────────────────────────────────────────────────────
 * Each entry has:
 *   name         {string}  — camelCase tool name (same in both providers)
 *   description  {string}  — when the model should call this tool
 *   params       {object}  — keyed by parameter name, each with:
 *     type        {string}  — JSON Schema type: 'STRING' | 'NUMBER' | 'BOOLEAN'
 *     description {string}  — what to pass for this parameter
 *     required    {boolean} — whether the parameter is required (default: false)
 *     enum        {string[]} — (optional) allowed values
 *
 * Server-side only. Never import in Client Components.
 */

export const TOOL_DEFINITIONS = {

  /* ── Tool 1: createServiceRequest ────────────────────────────── */

  createServiceRequest: {
    name: 'createServiceRequest',

    description:
      'Creates a vehicle service request after the customer has explicitly confirmed the details. ' +
      'Before calling, collect: service type, preferred date, and preferred time. ' +
      'Summarise the details to the customer and wait for their explicit confirmation. ' +
      'Do not call speculatively. Do not call before the customer confirms.',

    params: {
      serviceType: {
        type:        'STRING',
        required:    true,
        description:
          'The service the customer wants. Use the canonical name from the knowledge base where ' +
          'possible. Examples: "Oil & Filter Change", "Brake Inspection", "AC Service", ' +
          '"Tyre Rotation & Balancing", "Wheel Alignment", "Premium Care Package".',
      },
      vehicleDetails: {
        type:        'STRING',
        required:    false,
        description:
          'Vehicle description if the customer does not have a registered vehicle. ' +
          'Format: "[Year] [Make] [Model] [Fuel type]", e.g. "2019 Maruti Swift Petrol". ' +
          'Omit if vehicle is available in customer context.',
      },
      preferredDate: {
        type:        'STRING',
        required:    false,
        description:
          "Customer's preferred date for the service. Use YYYY-MM-DD if the customer " +
          'stated a specific date, or a natural phrase if they were approximate, ' +
          'e.g. "next Monday", "end of the week".',
      },
      preferredTime: {
        type:        'STRING',
        required:    false,
        description:
          "Customer's preferred time slot. As stated by the customer, " +
          'e.g. "9:00 AM", "morning", "after 3 PM".',
      },
      additionalNotes: {
        type:        'STRING',
        required:    false,
        description:
          'Any extra context that would help the service team: specific symptoms, ' +
          "customer concerns, prior service history mentioned, or special requests. " +
          'Do not include a summary of the general conversation.',
      },
    },
  },

  /* ── Tool 2: createCallbackRequest ───────────────────────────── */

  createCallbackRequest: {
    name: 'createCallbackRequest',

    description:
      'Logs a callback request when the customer wants the service team to call them. ' +
      "Before calling this tool, ask for the customer's preferred call time. " +
      'Do not call without knowing the reason.',

    params: {
      reason: {
        type:        'STRING',
        required:    true,
        description:
          'Why the customer wants to be called. One or two sentences. ' +
          'Examples: "Wants to discuss brake noise heard recently", ' +
          '"Has a question about AC service pricing".',
      },
      preferredTime: {
        type:        'STRING',
        required:    false,
        description:
          "When the customer prefers to be called. As stated by the customer, " +
          'e.g. "tomorrow morning", "weekday after 5 PM", "any time during business hours".',
      },
    },
  },

  /* ── Tool 3: escalateToHuman ─────────────────────────────────── */

  escalateToHuman: {
    name: 'escalateToHuman',

    description:
      'Flags this conversation for a human staff member to follow up. ' +
      'Use immediately when: the customer complains, raises a safety concern, ' +
      'asks for a human, raises a payment or legal issue, or the situation requires ' +
      'professional judgement. Do not wait. Do not try to resolve it yourself first.',

    params: {
      reason: {
        type:        'STRING',
        required:    true,
        description:
          'Why escalation is required. Concise summary for the staff member ' +
          'who will follow up. Include what the customer said that triggered escalation.',
      },
      urgency: {
        type:        'STRING',
        required:    false,
        enum:        ['normal', 'urgent'],
        description:
          '"urgent": safety concern (brake failure, smoke, fire, unresponsive vehicle) ' +
          'or severely distressed customer. ' +
          '"normal": complaint, payment dispute, out-of-scope request, repeated misunderstanding, ' +
          'or customer asking for a human.',
      },
      conversationSummary: {
        type:        'STRING',
        required:    false,
        description:
          'Optional brief summary of the conversation so far, to give the staff member context. ' +
          "Include the customer's main concern and any information already collected.",
      },
    },
  },

};
