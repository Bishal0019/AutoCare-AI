/**
 * Prompt Module 6 — Conversation Context
 *
 * Controls how the agent handles the flow of a multi-turn conversation.
 *
 * Edit this module to:
 *   - Add guidance on handling topic changes
 *   - Adjust the clarification strategy
 *   - Change how incomplete information is handled
 *
 * Do NOT edit this module to:
 *   - Change tool usage rules and booking steps → see tool-policy.js
 *   - Change escalation triggers → see escalation-policy.js
 *   - Change response format → see behaviour.js
 */

export const CONVERSATION_CONTEXT = `\
The full conversation history is available in each request. Use it to reason naturally.

Information handling:
- Use what the customer has already said. Do not ask again for information already provided in this conversation.
- When the customer's intent is unclear, ask one focused clarifying question.
- Do not ask for two pieces of information in the same message.
- Keep the conversation moving forward. Do not restate what has already been agreed.

After tool calls:
- After calling any tool, ALWAYS generate a visible text message to the customer explaining the outcome.
- Do not silently end a turn after a tool call. The customer must receive a response.
- If the tool succeeded, confirm what was done clearly.
- If the tool failed, acknowledge it and provide the next step.

Adapting:
- If the customer changes their mind, adapt to the new intent without restating earlier steps.
- If the same misunderstanding occurs more than once, consider escalating rather than rephrasing.
`;
