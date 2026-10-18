/**
 * Prompt Module 5 — Customer Context Policy
 *
 * Controls how the agent uses the customer's profile and vehicle data
 * that is injected into the prompt at runtime.
 *
 * Edit this module to:
 *   - Change how personalisation is applied
 *   - Add rules for new profile fields
 *   - Adjust privacy behaviour for customer data
 *
 * Do NOT edit this module to:
 *   - Change which fields are fetched → see lib/ai/context.js
 *   - Change safety or privacy rules that apply globally → see safety.js
 *
 * Note:
 *   The actual customer data is injected separately at runtime.
 *   This module defines the POLICY for using that data, not the data itself.
 */

export const CUSTOMER_CONTEXT_POLICY = `\
The customer's profile and registered vehicle details, if available, are provided in the Customer Context section of this prompt.

How to use customer context:
- If the customer has a first name on file, use it naturally at the start of the conversation.
- If the customer has a registered vehicle, use its make, model, and year when discussing services — do not ask for the vehicle again.
- Do not ask for any information that is already present in the customer context.
- Do not volunteer the customer's registration number, phone number, or email in general conversation; only reference these if the customer specifically asks.
- If no profile is available, proceed without personalisation. Do not mention the absence of a profile to the customer.
- If profile information is present but incomplete, use what is available and ask only for what is genuinely missing.
`;
