/**
 * AutoCare AI — System Prompt Composer
 *
 * Assembles the final system prompt from eight independently editable modules
 * plus two runtime data injections (customer context + business knowledge base).
 *
 * Module map:
 *   1. agent-identity.js      — who the agent is and its responsibilities
 *   2. behaviour.js           — communication style and response format
 *   3. safety.js              — non-negotiable constraints
 *   4. knowledge-policy.js    — how to use the business knowledge base
 *   5. customer-context.js    — how to use runtime customer/vehicle data
 *   6. conversation-context.js — how to handle multi-turn conversation flow
 *   7. tool-policy.js         — when and how to use the three tools
 *   8. escalation-policy.js   — when and how to escalate
 *
 * Runtime injections (not editable as prompt text):
 *   - Customer context string → built by lib/ai/context.js per request
 *   - Business knowledge base → lib/knowledge/index.js (KNOWLEDGE_BASE_CONTEXT)
 *
 * To update agent behaviour: edit the relevant module file.
 * To update business facts: edit lib/knowledge/business.js or faqs.js.
 * To update the prompt structure: edit buildSystemPrompt() below.
 *
 * API contract:
 *   buildSystemPrompt({ customerContext, knowledgeBase }) → string
 *   The returned string is passed directly to the AI model as the system prompt.
 *   This interface is stable — the API route does not need changes when modules are edited.
 */

import { AGENT_IDENTITY }        from './prompts/agent-identity.js';
import { BEHAVIOUR }             from './prompts/behaviour.js';
import { SAFETY }                from './prompts/safety.js';
import { KNOWLEDGE_POLICY }      from './prompts/knowledge-policy.js';
import { CUSTOMER_CONTEXT_POLICY } from './prompts/customer-context.js';
import { CONVERSATION_CONTEXT }  from './prompts/conversation-context.js';
import { TOOL_POLICY }           from './prompts/tool-policy.js';
import { ESCALATION_POLICY }     from './prompts/escalation-policy.js';

/* ── Section formatter ──────────────────────────────────────────── */

const HR = '─'.repeat(60);

/**
 * Wraps a prompt module or runtime value in a labelled section.
 * The label and rule divider help the model locate each section
 * when the full prompt is long.
 *
 * @param {string} label
 * @param {string} content
 * @returns {string}
 */
function section(label, content) {
  return `${HR}\n${label}\n${HR}\n${content.trim()}`;
}

/* ── Static assembly (module order matters) ─────────────────────── */

/**
 * Modules that do not change between requests.
 * Pre-joined at module load time to avoid repeated string concatenation.
 *
 * Order rationale:
 *   Identity → Behaviour → Safety → Knowledge Policy →
 *   Tool Policy → Escalation Policy → Conversation Context
 *
 *   Safety is placed early so constraints are established before
 *   operational rules. Tool and escalation policies follow knowledge
 *   policy so the model understands the knowledge bounds first.
 */
const STATIC_MODULES = [
  section('IDENTITY',              AGENT_IDENTITY),
  section('COMMUNICATION STYLE',   BEHAVIOUR),
  section('SAFETY AND LIMITATIONS',SAFETY),
  section('KNOWLEDGE POLICY',      KNOWLEDGE_POLICY),
  section('TOOL POLICY',           TOOL_POLICY),
  section('ESCALATION POLICY',     ESCALATION_POLICY),
  section('CONVERSATION HANDLING', CONVERSATION_CONTEXT),
].join('\n\n');

/* ── Composer ───────────────────────────────────────────────────── */

/**
 * Builds the complete system prompt for a single API request.
 *
 * The static modules are pre-assembled. Only the two runtime sections
 * (customer context and business knowledge) are composed per-request.
 *
 * @param {{ customerContext: string|null, knowledgeBase: string }} params
 *   customerContext — built by lib/ai/context.js; null if no profile on file
 *   knowledgeBase   — KNOWLEDGE_BASE_CONTEXT from lib/knowledge/index.js
 * @returns {string}
 */
export function buildSystemPrompt({ customerContext, knowledgeBase }) {
  const runtimeSections = [
    section(
      'CUSTOMER CONTEXT POLICY',
      CUSTOMER_CONTEXT_POLICY,
    ),
    section(
      'CUSTOMER CONTEXT — CURRENT SESSION',
      customerContext ?? 'No customer profile is available for this session.',
    ),
    section(
      'BUSINESS KNOWLEDGE BASE',
      knowledgeBase,
    ),
  ].join('\n\n');

  return `${STATIC_MODULES}\n\n${runtimeSections}`;
}
