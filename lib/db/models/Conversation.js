/**
 * Conversation model — AutoCare AI
 *
 * Stores a single support session between a customer and the AI agent.
 * Designed to be transport-agnostic: the same model stores text and
 * voice interactions. The transport (text / voice) is recorded but
 * storage and retrieval are identical for both.
 *
 * Authorization rule:
 *   ALL queries MUST include { clerkId: <userId from auth()> }.
 *
 * Status lifecycle:
 *   active → ended
 *
 * Privacy:
 *   Only the text content of user and assistant turns is stored.
 *   Tool call internals, system prompts, and customer context strings
 *   are never persisted.
 */

import mongoose from 'mongoose';

/* ── Message subdocument ────────────────────────────────────────── */

/**
 * A single turn in the conversation.
 * Stores only role and text — no tool metadata or internal identifiers.
 */
const MessageSchema = new mongoose.Schema(
  {
    role: {
      type:     String,
      enum:     ['user', 'assistant'],
      required: true,
    },
    text: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: [4000, 'Message text must be 4,000 characters or fewer'],
    },
    createdAt: {
      type:    Date,
      default: () => new Date(),
    },
  },
  { _id: false }
);

/* ── Conversation schema ────────────────────────────────────────── */

const ConversationSchema = new mongoose.Schema(
  {
    /** Owner — authorization key for every query. */
    clerkId: {
      type:     String,
      required: [true, 'clerkId is required'],
      index:    true,
    },

    /** 'active' while the session is open; 'ended' when it closes. */
    status: {
      type:    String,
      enum:    ['active', 'ended'],
      default: 'active',
      index:   true,
    },

    /**
     * Transport that created this conversation.
     * 'text' = web chat; 'voice' = voice interface (future).
     * Stored so the UI can show the appropriate icon.
     */
    transport: {
      type:    String,
      enum:    ['text', 'voice'],
      default: 'text',
    },

    /**
     * BCP 47 language tag detected from the first user message.
     * null if detection was not attempted.
     * Example: 'en', 'hi', 'mr'
     */
    language: {
      type:      String,
      default:   null,
      maxlength: [10, 'Language tag must be 10 characters or fewer'],
    },

    /** When the conversation started (first message or session open). */
    startedAt: {
      type:    Date,
      default: () => new Date(),
    },

    /** When the conversation ended. null if still active. */
    endedAt: {
      type:    Date,
      default: null,
    },

    /**
     * Ordered transcript of user and assistant turns.
     * Tool call internals are NOT stored here.
     */
    messages: {
      type:    [MessageSchema],
      default: [],
    },

    /**
     * Short human-readable summary of the conversation.
     * Defaults to the first user message (truncated).
     * Can be replaced with an AI-generated summary in future.
     */
    summary: {
      type:      String,
      default:   null,
      trim:      true,
      maxlength: [500, 'Summary must be 500 characters or fewer'],
    },

    /**
     * Reference to a service request created during this conversation.
     * Stores the human-readable REQ-XXXXXXXX reference string,
     * not the MongoDB ObjectId, so it is safe to display directly.
     */
    serviceRequestRef: {
      type:      String,
      default:   null,
      trim:      true,
      maxlength: [20, 'Service request reference must be 20 characters or fewer'],
    },

    /**
     * Cached count of messages in this conversation.
     * Updated atomically with $inc whenever messages are appended.
     * Avoids loading the full messages array just to count turns.
     */
    messageCount: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

/** Primary listing index: user's conversations newest first. */
ConversationSchema.index({ clerkId: 1, startedAt: -1 });

/* ── Model ──────────────────────────────────────────────────────── */

export default mongoose.models.Conversation
  || mongoose.model('Conversation', ConversationSchema);
