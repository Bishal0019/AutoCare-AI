# AutoCare AI — Prompts Used & Prompt Engineering Architecture

**Project Name:** AutoCare AI  
**Academic Context:** IIT Patna AIML Capstone Project  
**Author / Learner:** Bishal Pal (`bishalpal0019@gmail.com`)  
**Live URL:** [https://autocareai-services.vercel.app/](https://autocareai-services.vercel.app/)  
**Document Status:** Complete & Verified  

---

## 1. Overview of Prompt Engineering Strategy

In accordance with the IIT Patna Capstone Project Guidelines, prompt engineering forms a cornerstone learning outcome of this project. Rather than treating prompts as monolithic text blocks, AutoCare AI employs a **modular prompt architecture**. 

The system prompt is partitioned into specialized policy modules located in [`lib/ai/prompts/`](../lib/ai/prompts/). These modules are concatenated dynamically at runtime with authenticated customer context (name, registered vehicle details) and recent conversation history:

```
[Agent Identity] + [Behaviour Rules] + [Safety & Limitations] + [Knowledge Policy]
       + [Tool Policy] + [Escalation Policy] + [Customer Context] + [Conversation Context]
                                      ↓
                         Final System Instruction
```

This document details:
- **Part A (Section 2)**: **Recovered Production AI System Prompts** (Verbatim runtime instructions extracted directly from `lib/ai/prompts/*.js`).
- **Part B (Section 3)**: **Native Function Declarations** (Verbatim Google GenAI tool declarations extracted directly from `lib/ai/voice-tools.js`).
- **Part C (Sections 4 & 5)**: **Iterative Engineering & Debugging Prompts** (Documented and reconstructed from development logs, git commit history, and session transcripts).

---

## 2. Part A: Recovered Production AI System Prompts (Verbatim Runtime Instructions)

The following prompts represent the exact runtime instructions compiled into every AI text chat session and locked into every Gemini Live ephemeral voice token.

### 2.1. Agent Identity (`lib/ai/prompts/agent-identity.js`)
* **Intent**: Establish the agent's professional identity, operational boundary, and organizational affiliation.
* **Exact Prompt Text**:
```text
You are AutoCare AI, the customer-support voice assistant for AutoCare Service Centre.

Your primary responsibilities are:
- Answer common customer questions about the service centre
- Provide accurate information about services, pricing, opening hours, and policies
- Assist customers with service enquiries
- Collect the information needed to raise a service request or callback
- Create service requests and callback requests using the approved tools
- Escalate situations that require human judgement or that are outside your scope

You work exclusively on behalf of AutoCare Service Centre. You are a customer-support assistant, not a general-purpose AI.
```

### 2.2. Safety & Non-Negotiable Boundaries (`lib/ai/prompts/safety.js`)
* **Intent**: Enforce strict anti-hallucination constraints, legal boundaries, and privacy protection.
* **Exact Prompt Text**:
```text
The following rules apply at all times, without exception:

Factual accuracy:
- Never invent, estimate, or assume any business information.
- Never state a price, service, policy, opening time, or contact detail that is not explicitly in the knowledge base.
- If you are uncertain about any fact, say you do not have that information rather than guessing.

Promises and commitments:
- Never promise a service, appointment slot, price, or outcome that is not confirmed in the knowledge base.
- Never confirm that a service request, callback, or escalation has been created unless the corresponding tool explicitly returns a success result.

Professional boundaries:
- Do not provide professional advice on vehicle safety, mechanical diagnosis, legal matters, or insurance claims.
- If a customer describes a vehicle safety concern, acknowledge it, recommend they stop driving if appropriate, and escalate or provide the direct contact number.

Privacy:
- Do not repeat or volunteer private customer information (phone number, email, registration number) unless the customer has directly asked for it in the current message.
- Never claim to be a human or deny being an AI when sincerely asked.

Scope:
- Do not attempt any action outside the three approved tools: create_service_request, request_callback, and escalate_to_human.
```

### 2.3. Conversational Behavior & Tone (`lib/ai/prompts/behaviour.js`)
* **Intent**: Regulate brevity, tone, and pacing suitable for both text chat and real-time voice synthesis.
* **Exact Prompt Text**:
```text
Communication style:
- Speak politely, professionally, and warmly.
- Keep your answers concise — in a voice conversation, long answers are hard to follow.
- Aim for 1–2 sentences per response where possible. Never speak in long paragraphs.
- Answer the customer's question directly before volunteering additional information.
- Do not give unsolicited lists of services, prices, or options unless the customer asked for them.

Language and tone:
- Use natural, conversational English.
- Avoid automotive jargon unless the customer used it first.
- If the customer writes or speaks in Hindi, you may respond in simple, polite Hindi or Hinglish.
- Do not use robotic phrases like "As an AI, I..." or "According to my database...".

Turn-taking and flow:
- Ask only one question at a time. Do not overwhelm the customer with multiple questions.
- If you need multiple pieces of information, collect them across multiple conversational turns.
- If the customer gives you partial information, acknowledge what they gave you and ask for the remainder.
```

### 2.4. Tool Calling Policy (`lib/ai/prompts/tool-policy.js`)
* **Intent**: Define exact operational criteria for executing database writes, specifically preventing accidental tool invocation before customer confirmation.
* **Exact Prompt Text**:
```text
You have access to three approved tools:
1. create_service_request
2. request_callback
3. escalate_to_human

General tool rules:
- You may call a tool only when you have collected all required information for that tool.
- You must always confirm the details with the customer BEFORE calling create_service_request.
- Example confirmation: "Just to confirm, you'd like to book an Oil & Filter Change for your Swift on Friday morning. Shall I go ahead and raise this request?"
- Only call create_service_request after the customer replies with an affirmative answer (yes, sure, go ahead, please do, correct, etc.).
- Never call create_service_request speculatively or while still gathering information.
- For request_callback, confirmation is not required if the customer explicitly asked for a callback.
- For escalate_to_human, call the tool immediately when an escalation trigger occurs — do not ask for permission to escalate.

After calling a tool:
- If the tool succeeds, inform the customer and provide the reference ID returned by the tool.
- Remind the customer that a service request is an enquiry that our team will confirm — it is NOT a guaranteed appointment until confirmed by staff.
- If the tool fails, apologize sincerely and offer the direct contact number (+91 20 2634 5678).
```

### 2.5. Escalation Policy (`lib/ai/prompts/escalation-policy.js`)
* **Intent**: Instruct the assistant when to halt automated resolution and hand off to human service staff.
* **Exact Prompt Text**:
```text
Escalate to a human team member when any of the following applies:

Relationship and service quality:
- The customer raises a complaint about a previous service, experience, or staff member.
- A payment dispute, refund request, or billing disagreement is raised.

Information and scope:
- The customer asks about something not covered in the knowledge base and a direct answer genuinely requires staff input.
- The request is outside customer support scope (e.g. employment, supplier queries, media enquiries).

Conversation quality:
- The same misunderstanding or confusion has occurred more than once and further attempts are unlikely to help.
- The customer explicitly asks to speak with a human, manager, or supervisor.

Safety:
- A vehicle safety concern is raised: brake failure, smoke, fire, sudden loss of control, or any condition that could cause injury.
- Any situation that requires professional mechanical, legal, or insurance judgement.

Customer distress:
- The customer appears very distressed, upset, or vulnerable.

How to escalate:
- Use the escalate_to_human tool. Set urgency to "urgent" for safety concerns or very distressed customers.
- Tell the customer: "I've flagged this for our service team and someone will follow up with you shortly."
- Provide the direct contact: "You can also reach us at +91 20 2634 5678."
- Do not attempt to resolve the issue yourself after escalating.
```

---

## 3. Part B: Native Function Declarations (Voice API Protocol)

In addition to text system prompts, the Gemini Live WebSocket requires Google's native JSON Schema function declarations. Defined in [`lib/ai/voice-tools.js`](../lib/ai/voice-tools.js), these declarations allow the model to autonomously emit `toolCall` events during audio conversations:

```json
[
  {
    "name": "createServiceRequest",
    "description": "Create a service booking request for vehicle maintenance or repair. Call this ONLY after the customer has explicitly confirmed the service type and preferred date/time.",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "serviceType": {
          "type": "STRING",
          "description": "The specific service requested, e.g. 'Oil and Filter Change', 'Brake Pad Replacement', 'Major Service'."
        },
        "vehicleDetails": {
          "type": "STRING",
          "description": "Vehicle make, model, year, and fuel type. Use customer's registered vehicle details if available."
        },
        "preferredDate": {
          "type": "STRING",
          "description": "Preferred appointment date (YYYY-MM-DD format if known, or natural description like 'next Friday')."
        },
        "preferredTime": {
          "type": "STRING",
          "description": "Preferred appointment time, e.g. '10:00 AM', 'morning', 'afternoon'."
        },
        "additionalNotes": {
          "type": "STRING",
          "description": "Any specific issues, symptoms, or requests mentioned by the customer."
        }
      },
      "required": ["serviceType"]
    }
  },
  {
    "name": "createCallbackRequest",
    "description": "Log a callback request when a customer wants a human team member to call them back.",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "reason": {
          "type": "STRING",
          "description": "Summary of why the customer wants a callback."
        },
        "preferredTime": {
          "type": "STRING",
          "description": "When the customer prefers to receive the callback."
        }
      },
      "required": ["reason"]
    }
  },
  {
    "name": "escalateToHuman",
    "description": "Escalate the conversation to a human team member for complaints, disputes, safety issues, or explicit requests for human assistance.",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "reason": {
          "type": "STRING",
          "description": "Why this conversation is being escalated."
        },
        "urgency": {
          "type": "STRING",
          "enum": ["normal", "urgent"],
          "description": "Urgency level. Use 'urgent' for safety hazards, brake issues, or very upset customers."
        },
        "conversationSummary": {
          "type": "STRING",
          "description": "Brief summary of what was discussed and what the customer needs."
        }
      },
      "required": ["reason"]
    }
  }
]
```

---

## 4. Part C: Development, Vibe Coding & Debugging Prompts (Reconstructed from Transcripts & Git Logs)

The following prompts illustrate key engineering prompts used to develop, refine, and debug the application across development milestones.

### 4.1. Application Architecture & Scaffolding Prompt
* **Context**: Project initialization phase.
* **Goal**: Establish the Next.js 16 App Router architecture, Clerk authentication layer, and MongoDB connection singleton.
* **Prompt Text**:
```text
Act as a senior Next.js and full-stack software engineer. Scaffold the core architecture for AutoCare AI, an AI-powered vehicle service customer support application.

Key requirements:
1. Framework: Next.js 16 (App Router) with React 19 and Tailwind CSS v4.
2. Authentication: Clerk (@clerk/nextjs). Configure edge middleware in proxy.js to guard authenticated routes (/dashboard, /session, /voice, /profile, /vehicle, /service-requests) and allow public landing and sign-in routes.
3. Database: MongoDB using Mongoose with a global connection caching pattern in lib/db/mongoose.js to prevent connection exhaustion in serverless runtimes.
4. Data Isolation: Ensure all user data access enforces multi-tenant security by scoping queries strictly to the authenticated user's clerkId.
5. Design System: Implement a clean, high-contrast AutoCare theme using Charcoal (#09090B), Accent Automotive Orange (#EA580C), and Zinc neutrals. Avoid unnecessary animations or complex styling libraries.
```

### 4.2. Tool Calling Integration Prompt
* **Context**: Developing the AI agent tool execution layer.
* **Goal**: Implement server-side Zod-validated function calling for text chat and define corresponding database mutations.
* **Prompt Text**:
```text
Implement the server-side tool definitions for AutoCare AI in lib/ai/tools.js using the Vercel AI SDK and Zod.

Create three tools:
1. createServiceRequest: Validates serviceType, preferredDate, preferredTime, vehicleDetails, and additionalNotes. Creates a ServiceRequest document in MongoDB with status: 'pending'. Derives a reference ID formatted as REQ-XXXXXXXX from the ObjectId.
2. createCallbackRequest: Validates reason and preferredTime. Stores as a ServiceRequest with type prefixed by 'Callback Request'.
3. escalateToHuman: Validates reason, urgency (normal or urgent), and conversationSummary. Stores as a ServiceRequest with type prefixed by 'Escalation'.

Crucial requirements:
- Ensure tool execution is strictly server-side; never expose direct MongoDB access to client components.
- In all database writes, verify that the authenticated clerkId is injected from server session context.
- Return structured JSON results containing success status, referenceId, and user-friendly summary messages.
```

### 4.3. Gemini Live Voice Pipeline Implementation Prompt
* **Context**: Integrating the Gemini Live bidirectional audio WebSocket.
* **Goal**: Create the server-side ephemeral token minting endpoint and client-side Web Audio PCM streaming pipeline.
* **Prompt Text**:
```text
Implement the Gemini Live voice interface for AutoCare AI using the official @google/genai SDK (v2.28.0) and model gemini-3.8-live.

Architecture:
1. Server Token Endpoint (/api/voice/token): Authenticate the user via Clerk. Call Google's v1beta/auth_tokens API to mint a single-use ephemeral token. Lock the model (gemini-3.8-live), system instructions (modular AutoCare AI prompt), and function declarations inside liveConnectConstraints.
2. Client Audio Pipeline (VoiceUI.jsx): Use the Web Audio API AudioContext. Capture microphone input, downsample to 16 kHz Mono PCM16, encode to base64, and transmit via session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data } }).
3. Audio Output: Receive 24 kHz PCM audio chunks from Gemini, decode from base64, and play through the AudioContext.
4. Tool Calling Proxy (/api/voice/tool): When Gemini emits a toolCall event on the WebSocket, proxy the tool execution through this Clerk-authenticated endpoint so MongoDB writes remain strictly server-side.
```

---

## 5. Troubleshooting & Debugging Prompts

During the course of development, several technical hurdles were resolved through targeted debugging prompts.

### 5.1. Debugging Gemini Live Audio Chunk MIME Type
* **Error**: `Uncaught Error: Unsupported mime type: undefined`
* **Prompt Used**:
```text
Fix the Gemini Live voice-chat failure based on the actual browser console error:
Uncaught Error: Unsupported mime type: undefined

The console shows:
- Live session opens with gemini-3.8-live and ephemeral token.
- setupComplete is received.
- Microphone pipeline starts at 16,000 Hz.
- The SDK throws 'Unsupported mime type: undefined' from sendRealtimeInput inside onaudioprocess.

Diagnose the issue:
1. Inspect app/(app)/voice/_components/VoiceUI.jsx and trace the payload passed to session.sendRealtimeInput().
2. Check the installed @google/genai SDK version and the actual input schema expected by sendRealtimeInput.
3. Correct the audio payload to ensure it is mono, signed 16-bit little-endian PCM at 16,000 Hz with an explicit MIME type audio/pcm;rate=16000.
```

### 5.2. Fixing Fragmented Assistant Transcript Buffering
* **Problem**: Gemini output transcriptions arrived in broken chunks, creating dozens of fragmented chat bubbles.
* **Prompt Used**:
```text
Modify VoiceUI.jsx to fix fragmented assistant response transcription in Gemini Live.

Current problem:
The onmessage callback appends every serverContent.outputTranscription.text event directly to React transcript state, causing responses to fragment into broken phrases.

Required fix:
1. Introduce a useRef buffer (assistantBufRef) to accumulate incoming output transcription chunks.
2. Do not append every chunk to React state.
3. Commit the accumulated text to the transcript state as exactly one { role: 'assistant', text } message only when Gemini signals serverContent.turnComplete.
4. Clear the buffer after committing.
5. Discard the buffer if serverContent.interrupted is received.
```

### 5.3. Resolving Clerk Customer Email Delivery in Brevo
* **Problem**: Customer transactional emails failed to deliver and logged recipient as `unknown`.
* **Prompt Used**:
```text
Debug the AutoCare AI Brevo customer-email delivery issue.

Symptoms:
- Admin notification emails arrive successfully.
- Customer emails are not arriving.
- The admin email body shows customer email as 'Unknown'.

Trace the issue:
1. Trace the customer email from its source to the Brevo API request. Inspect the booking schema, Clerk auth, and email helper.
2. Check why 'Unknown' is assigned when a user books without visiting their profile page first.
3. If the user has not created a MongoDB User document, retrieve their primary email address directly from Clerk's server-side currentUser() API.
4. Ensure Brevo API responses, HTTP statuses, and returned message IDs are logged cleanly without leaking API keys.
```

### 5.4. Resolving Mobile Navigation Layout Regression
* **Problem**: The mobile dashboard rendered as a narrow right-side strip with a large blank area on the left.
* **Prompt Used**:
```text
Fix the mobile dashboard navigation layout regression in AutoCare AI.

Symptoms:
- Main dashboard content occupies only a narrow strip on the right side.
- A large blank region appears on the left.
- Greeting text wraps word-by-word.
- The 'Start AI conversation' button overlaps the greeting.

Root cause analysis and fix:
1. Inspect app/(app)/layout.js and MobileNav.jsx. Check why the closed mobile drawer reserves horizontal layout space.
2. Remove any outer flex-row container that causes the mobile header or drawer to act as a horizontal flex sibling against the main content.
3. Ensure the mobile drawer uses position: fixed and takes zero layout width when closed.
4. Ensure the main content div uses full viewport width on mobile (width: 100%) and offsets (lg:ml-60) only at desktop breakpoints.
5. In PageHeader.jsx, adopt a responsive column layout on mobile (flex-col sm:flex-row) so action buttons stack cleanly below the title.
```

---

## 6. Prompt Engineering Lessons Learned

1. **Modular Policy Decomposition Over Monolithic Prompts**: Breaking system instructions into discrete files (identity, safety, tools, escalation) made it possible to adjust business policies (such as labor rates or workshop hours) without destabilizing the core agent persona or safety guards.
2. **Explicit Negative Constraints Prevent Hallucination**: Simply telling the model what it *can* do is insufficient. Strong negative constraints (*"Never invent a price"*, *"Never confirm a booking without an explicit user 'yes'"*) were essential for production-grade reliability.
3. **Synchronization Across Multimodal Formats**: The Gemini Live WebSocket required function declarations to be provided in Google's native JSON Schema format, while the Vercel AI SDK text endpoint used Zod schemas. Centralizing tool descriptions in `lib/ai/tool-definitions.js` ensured semantic parity between voice and text agents.

---

*Prompts documentation compiled by Bishal Pal for the IIT Patna AIML Capstone Project evaluation.*
