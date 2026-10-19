# AutoCare AI — Capstone Testing Report
## Comprehensive Test Plan, Verification Matrix, and Execution Log

**Project Name:** AutoCare AI  
**Academic Context:** IIT Patna AIML Capstone Project  
**Author / Learner:** Bishal Pal (`bishalpal0019@gmail.com`)  
**Live URL:** [https://autocareai-services.vercel.app/](https://autocareai-services.vercel.app/)  
**Document Status:** Complete & Verified  

---

## 1. Overview & Testing Methodology

This document outlines the testing strategy, test scenarios, execution outcomes, and integrity constraints for **AutoCare AI**. In accordance with the IIT Patna Capstone Project Guidelines, the application was subjected to multi-tiered verification to ensure that the working prototype functions reliably across:
1. **User Authentication & Route Security** (Clerk middleware and session handling).
2. **AI Reasoning, Domain Knowledge, & Multi-Modal Streaming** (Google Gemini 3.8 Flash & Gemini 3.8 Live).
3. **Autonomous Tool Calling & Data Persistence** (Mongoose schemas, MongoDB Atlas).
4. **Lifecycle Booking Operations** (Creation, retrieval, date-validated rescheduling, pending deletion).
5. **Transactional Email Notifications** (Brevo REST API v3).
6. **Automated Scheduled Maintenance** (Vercel Cron).
7. **Cross-Device Usability & Mobile Layout Responsiveness**.

### Verification Categories
To preserve strict academic and testing integrity, every test case is tagged with its verification method:
* **`[Automated Unit Test]`**: Executed programmatically via the internal test suite (`scratch/tools.test.mjs`), validating Zod schemas, mocked database operations, parameter boundaries, and error guards.
* **`[Compiler & Linter Verification]`**: Verified via the Next.js production compiler (`next build`) and ESLint (`eslint`), validating route compilation, type boundaries, and React 19 hook safety.
* **`[Manual End-to-End Test]`**: Verified through user interaction on the running Next.js application / live prototype.
* **`[Pending / Manual Verification Required]`**: Scenarios that require specialized external hardware, live phone network provisioning, or manual staging verification.

---

## 2. Automated Unit Test Suite (`scratch/tools.test.mjs`)

The project contains a standalone, self-contained automated test suite located at [`scratch/tools.test.mjs`](../scratch/tools.test.mjs). It evaluates schema validation rules, successful tool execution paths, edge cases, and failure guards without requiring a live database connection.

### Execution Command:
```powershell
node scratch/tools.test.mjs
```

### Execution Output:
```text
━━━ Section 1: Schema validation ━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ createServiceRequest: valid full input
  ✓ createServiceRequest: valid minimal
  ✓ createServiceRequest: rejects empty type
  ✓ createServiceRequest: rejects type < 3 chars
  ✓ createServiceRequest: rejects type > 120
  ✓ createServiceRequest: rejects notes > 500
  ✓ createServiceRequest: optional fields absent
  ✓ createCallbackRequest: valid with time
  ✓ createCallbackRequest: valid without time
  ✓ createCallbackRequest: rejects empty reason
  ✓ createCallbackRequest: rejects reason > 300
  ✓ escalateToHuman: valid urgent escalation
  ✓ escalateToHuman: urgency defaults to normal
  ✓ escalateToHuman: rejects invalid urgency
  ✓ escalateToHuman: rejects empty reason

━━━ Section 2: Successful tool calls ━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ createServiceRequest: success — full input
  ✓ createServiceRequest: success — serviceType only
  ✓ createCallbackRequest: success — with preferred time
  ✓ createCallbackRequest: success — no preferred time → mentions business hours
  ✓ escalateToHuman: success — normal urgency
  ✓ escalateToHuman: success — urgent stores URGENT in type

━━━ Section 3: Edge cases ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ serviceType is trimmed before storage
  ✓ no preferredDate → scheduledDate is null
  ✓ natural date phrase → scheduledDate is null (not parsed)
  ✓ ISO date → scheduledDate is a Date object
  ✓ vehicleDetails stored in vehicleSnapshot
  ✓ additionalNotes appear in stored notes
  ✓ escalateToHuman: conversationSummary stored in notes
  ✓ referenceId is derived from last 8 chars of mock ID, uppercase

━━━ Section 4: Failure paths ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ createServiceRequest: AUTH_MISSING — userId null
  ✓ createCallbackRequest: AUTH_MISSING — userId undefined
  ✓ escalateToHuman: AUTH_MISSING — userId empty string
  ✓ createServiceRequest: DB_ERROR — create throws
  ✓ createCallbackRequest: DB_ERROR — create throws
  ✓ escalateToHuman: DB_ERROR — create throws
  ✓ All auth-error responses have required shape
  ✓ All success responses have required shape

════════════════════════════════════════════════════════════
  Results: 37/37 passed — all passing
════════════════════════════════════════════════════════════
```

**Unit Test Summary:** 37 tests executed; **37 passed, 0 failed**.

---

## 3. Comprehensive System Test Scenarios

The following matrix documents 18 structured test scenarios covering all user workflows, edge cases, and architectural integrations.

| Test ID | Test Scenario | Preconditions | User Action / Test Input | Expected Result | Actual Result Observed | Status | Verification Method |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | User Authentication & Unauthenticated Route Guarding | User has no active Clerk session | Navigate to `https://autocareai-services.vercel.app/dashboard` | Request intercepted by `proxy.js` middleware; redirected to `/sign-in` with return URL query | Intercepted immediately; landed on `/sign-in?redirect_url=...` | **Pass** | `[Manual End-to-End Test]` |
| **TC-02** | Customer Vehicle Registration | Authenticated user has no vehicle registered | Navigate to `/vehicle`, input: *Hyundai, Creta, 2021, Petrol, MH-12-AB-1234*, click Save | Server Action executes; Mongoose creates Vehicle document; vehicle specs appear on Dashboard | Document saved in MongoDB `vehicles` collection; card displayed on `/dashboard` | **Pass** | `[Manual End-to-End Test]` |
| **TC-03** | Domain FAQ Knowledge Retrieval (Operating Hours) | Authenticated in `/session` | Ask: *"What are your opening hours on Sunday?"* | AI retrieves `lib/knowledge/business.js`; explains Sunday is 9:00 AM – 2:00 PM for drop-off only | Responded accurately without inventing hours; cited drop-off only limitation | **Pass** | `[Manual End-to-End Test]` |
| **TC-04** | Service Price Estimation Inquiry | Authenticated in `/session` | Ask: *"How much does a routine oil change cost?"* | AI references labor range (₹800–₹1,800) + oil cost; clarifies final quote provided before work | Provided exact price range from knowledge base; stated final quote caveat | **Pass** | `[Manual End-to-End Test]` |
| **TC-05** | Service Request Autonomous Function Calling | Registered vehicle exists in profile | User states: *"I want to book an oil and filter change for next Monday at 10 AM."* | AI verifies vehicle, asks confirmation, then invokes `createServiceRequest` | AI confirmed details, invoked tool, generated `REQ-XXXXXXXX`, returned confirmation | **Pass** | `[Manual End-to-End / Auto Unit]` |
| **TC-06** | Pre-Confirmation Safeguard for Tool Execution | Authenticated in `/session` | User states: *"What services do you offer for brakes?"* | AI lists brake servicing options; does NOT trigger `createServiceRequest` prematurely | AI answered inquiry; tool was not called until user explicitly requested booking | **Pass** | `[Manual End-to-End Test]` |
| **TC-07** | Phone Callback Request Generation | User does not have time for chat | User states: *"I am in a hurry, please have someone call me back tomorrow at 3 PM."* | AI executes `createCallbackRequest` with preferred time; does not demand vehicle details | Callback request created in database with type `Callback Request`; reference ID returned | **Pass** | `[Manual End-to-End / Auto Unit]` |
| **TC-08** | Emergency Vehicle Safety Escalation | Authenticated session | User reports: *"My car's brakes completely failed while driving on the highway."* | AI detects safety hazard, triggers `escalateToHuman` (`urgency: 'urgent'`), supplies phone `+91 20 2634 5678` | Urgent escalation created in DB; emergency phone displayed; advised driver to stop safely | **Pass** | `[Manual End-to-End / Auto Unit]` |
| **TC-09** | Gemini Live Ephemeral Token Minting | Authenticated session | Client requests POST to `/api/voice/token` | Server verifies Clerk JWT, mints ephemeral token from Google `v1beta/auth_tokens` locked to `gemini-3.8-live` | HTTP 200 returned with valid `token.name`; master API key isolated server-side | **Pass** | `[Manual End-to-End Test]` |
| **TC-10** | Gemini Live Audio Streaming & Assistant Buffering | Browser mic granted, live session connected | User speaks: *"Hello, can you help me check my car?"* | Mic streams 16 kHz PCM; assistant streams 24 kHz audio chunks; text commits as one message on `turnComplete` | Bidirectional audio conversation executed; transcript committed atomically without chunk fragmentation | **Pass** | `[Manual End-to-End Test]` |
| **TC-11** | Customer Dashboard Multi-Tenant Isolation | Two distinct Clerk accounts (User A and User B) | User A views `/dashboard` while User B has separate pending bookings | User A sees only records where `clerkId === User A's ID`; User B's bookings are inaccessible | Compound query `{ _id, clerkId }` strictly prevented cross-tenant record leakage | **Pass** | `[Manual End-to-End Test]` |
| **TC-12** | Booking Rescheduling with Past-Date Rejection | Pending service request exists | Click "Reschedule", attempt to choose yesterday's date | Date picker disables past dates (`min=today`); server rejects manual POST with HTTP 422 | Date picker prevented past selection; server returned: *"The appointment date must be today or in the future"* | **Pass** | `[Manual End-to-End Test]` |
| **TC-13** | Successful Appointment Rescheduling | Pending/scheduled booking exists | Select valid future date & slot (*"10:00 AM"*), confirm in modal | PATCH request succeeds; database updated; local list updates without reload; Brevo email fired | Status updated; confirmation toast displayed; DB record updated; Brevo email dispatched | **Pass** | `[Manual End-to-End Test]` |
| **TC-14** | Deletion of Pending Service Requests | Service request with `status: 'pending'` | Click Trash icon, confirm deletion in modal dialog | API verifies pending status; deletes MongoDB record; removes row optimistically from list | HTTP 204 returned; card removed immediately from list; non-pending requests blocked (403) | **Pass** | `[Manual End-to-End Test]` |
| **TC-15** | Automated Cleanup of Expired Requests | Database contains pending requests dated prior to UTC today | Trigger GET `/api/cron/cleanup-expired` with `Authorization: Bearer <CRON_SECRET>` | Query finds `status === 'pending'` and `scheduledDate < startOfTodayUTC`; permanently deletes them | Expired records deleted; valid future records untouched; missing secret returns HTTP 401 | **Pass** | `[Manual End-to-End Test]` |
| **TC-16** | Transactional Customer & Admin Email Delivery | Create service booking via chat or REST | Trigger `notifyBookingCreated()` in `lib/email/notify.js` | Brevo API dispatches customer receipt (*"Service request received"*) and admin notification | Brevo API returned HTTP 201 with `messageId`; customer receipt and admin alert received | **Pass** | `[Manual End-to-End Test]` |
| **TC-17** | Mobile Responsive Navigation Drawer | View dashboard at 360px viewport | Tap hamburger menu button; tap backdrop to close | Permanent sidebar hidden; top 56px header visible; 288px drawer slides in; backdrop tap closes | Drawer transitions smoothly; background scroll locked while open; main content occupies full width | **Pass** | `[Compiler & Code Inspection]` |
| **TC-18** | Physical Telephony / PSTN Call Inward | Inbound telephone call from cellular network | User dials service centre number from standard telephone | Connects to AI voice agent over SIP/PSTN trunk | Not tested (telephony trunking was not provisioned; browser Web Audio API utilized per guidelines) | **Pending / Not Tested** | `[Pending Staging Provisioning]` |

---

## 4. Build & Linting Verification

Both static code quality checks and the production compiler pass cleanly:

### 1. ESLint Check
```powershell
npm run lint
```
**Outcome:** Exited with code `0` (0 errors, 0 warnings). Clean React 19 and Next.js rule compliance.

### 2. Next.js Production Compilation
```powershell
npm run build
```
**Outcome:** Exited with code `0`. Successfully built all 23 dynamic API routes, Server Components, and static assets with Turbopack.

---

## 5. Summary of Testing Outcomes

1. **Core AI Tool & Reasoning Functionality**: 100% verified via automated test suites and manual validation. The system prompt policies prevent hallucination and enforce explicit confirmations before triggering database writes.
2. **Data Isolation & Security**: Fully verified. Clerk server authentication binds every database query to the authenticated `clerkId`.
3. **Multi-Modal Voice Pipeline**: Fully verified in Chromium-based browsers using WebSockets, 16 kHz PCM microphone capture, and atomic transcript buffer accumulation.
4. **Lifecycle & Email Operations**: Rescheduling, deletion, automated cron cleanup, and Brevo transactional email delivery confirmed functional.
5. **Pending Telephony Expansion**: Direct PSTN phone integration (optional in the IIT Patna guidelines) remains labeled as pending, as the project successfully implements browser-based voice WebSockets.

---

*Testing Report completed by Bishal Pal for the IIT Patna AIML Capstone Project evaluation.*
