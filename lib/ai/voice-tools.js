/**
 * lib/ai/voice-tools.js — Gemini Live API adapter
 *
 * Responsibility: bridge between the shared business logic in
 * lib/ai/tools.js and the Gemini Live API's specific requirements.
 *
 * This file does NOT own any business logic or tool descriptions.
 * Both are sourced from:
 *   lib/ai/tool-definitions.js — authoritative tool metadata (names,
 *     descriptions, parameter schemas). Shared with text agent.
 *   lib/ai/tools.js            — authoritative execute() functions.
 *     Shared with text agent.
 *
 * What this file adds (minimum necessary adapters):
 *   VOICE_TOOL_DECLARATIONS — converts the shared metadata into the
 *     Google native function declaration format required by Gemini Live.
 *     Generated programmatically; zero description duplication.
 *
 *   executeVoiceTool()      — thin dispatcher that looks up the tool
 *     by name in buildTools(userId) and calls its execute(). The voice
 *     tool proxy route (/api/voice/tool) calls this so that all DB
 *     writes go through the same code path as the text agent.
 *
 * Server-side only. Never import in Client Components.
 */

import { TOOL_DEFINITIONS } from './tool-definitions.js';
import { buildTools }        from './tools.js';

/* ── Generate Google native declarations from shared metadata ───── */

/**
 * Converts a single TOOL_DEFINITIONS entry into a Google function
 * declaration object for the Gemini Live API.
 *
 * @param {{ name, description, params }} def
 * @returns {{ name, description, parameters }}
 */
function toFunctionDeclaration(def) {
  const properties = {};
  const required   = [];

  for (const [key, meta] of Object.entries(def.params)) {
    const prop = {
      type:        meta.type,
      description: meta.description,
    };
    // Include enum if defined (e.g. urgency: ['normal', 'urgent'])
    if (meta.enum) prop.enum = meta.enum;
    properties[key] = prop;
    if (meta.required) required.push(key);
  }

  return {
    name:        def.name,
    description: def.description,
    parameters: {
      type: 'OBJECT',
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
  };
}

/**
 * Tool declarations in Gemini Live's native format.
 * Generated from TOOL_DEFINITIONS — descriptions are never duplicated here.
 * Included in liveConnectConstraints when minting the ephemeral token so
 * that the model, system instructions, and tools are all server-controlled.
 */
export const VOICE_TOOL_DECLARATIONS = [
  {
    functionDeclarations: Object.values(TOOL_DEFINITIONS).map(toFunctionDeclaration),
  },
];

/* ── Tool executor (shared business operations) ─────────────────── */

/**
 * Dispatches a tool call received from the Gemini Live session to the
 * shared execute() function in lib/ai/tools.js.
 *
 * Called exclusively by /api/voice/tool (Clerk-authenticated), ensuring:
 *   - userId is always verified server-side before any DB write
 *   - The browser never touches MongoDB directly
 *   - Tool execution uses the identical code path as the text agent
 *
 * @param {string} toolName — The function name from the Live toolCall event
 * @param {object} args     — Parsed arguments from the toolCall event
 * @param {string} userId   — Clerk userId from auth() in the API route
 * @returns {Promise<object>}
 */
export async function executeVoiceTool(toolName, args, userId) {
  const tools = buildTools(userId);
  const tool  = tools[toolName];

  if (!tool) {
    return {
      success:      false,
      errorCode:    'UNKNOWN_TOOL',
      errorMessage: `Unknown tool: ${toolName}. Please try again or call us at +91 20 2634 5678.`,
    };
  }

  if (!args || typeof args !== 'object') {
    return {
      success:      false,
      errorCode:    'VALIDATION_ERROR',
      errorMessage: 'I was unable to process that request. Please try again.',
    };
  }

  return tool.execute(args);
}
