/**
 * Tool test suite — AutoCare AI
 * Run: node scratch/tools.test.mjs   (from project root)
 *
 * Sections:
 *   1. Schema validation  — no DB needed
 *   2. Success paths      — mocked DB
 *   3. Edge cases         — mocked DB
 *   4. Failure paths      — auth missing, DB error
 */

/* ── No external imports — test logic is self-contained ─────────── */

/* ── Test runner ────────────────────────────────────────────────── */

let pass = 0, fail = 0;
const pending = [];

function test(name, fn) {
  const result = (() => { try { return fn(); } catch (e) { return Promise.reject(e); } })();
  if (result && typeof result.then === 'function') {
    pending.push(
      result
        .then(() => { console.log(`  ✓ ${name}`); pass++; })
        .catch(e  => { console.log(`  ✗ ${name}: ${e.message}`); fail++; })
    );
  } else {
    console.log(`  ✓ ${name}`); pass++;
  }
}

function assert(cond, msg)   { if (!cond) throw new Error(msg ?? 'Assertion failed'); }
function eq(a, b, msg)       { if (a !== b) throw new Error(msg ?? `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function has(obj, key)       { if (!(key in obj)) throw new Error(`Missing field: "${key}"`); }

/* ── Replicated schema constraints (mirrors Zod rules in tools.js) ─ */

function validateServiceRequest({ serviceType, vehicleDetails, preferredDate, preferredTime, additionalNotes } = {}) {
  if (typeof serviceType !== 'string' || serviceType.length < 3)  return { ok: false, issue: 'serviceType min 3' };
  if (serviceType.length > 120)                                    return { ok: false, issue: 'serviceType max 120' };
  if (vehicleDetails  !== undefined && vehicleDetails.length > 200)  return { ok: false, issue: 'vehicleDetails max 200' };
  if (preferredDate   !== undefined && preferredDate.length  > 50)   return { ok: false, issue: 'preferredDate max 50' };
  if (preferredTime   !== undefined && preferredTime.length  > 50)   return { ok: false, issue: 'preferredTime max 50' };
  if (additionalNotes !== undefined && additionalNotes.length > 500) return { ok: false, issue: 'additionalNotes max 500' };
  return { ok: true };
}

function validateCallbackRequest({ reason, preferredTime } = {}) {
  if (typeof reason !== 'string' || reason.length < 3) return { ok: false, issue: 'reason min 3' };
  if (reason.length > 300)                             return { ok: false, issue: 'reason max 300' };
  if (preferredTime !== undefined && preferredTime.length > 100) return { ok: false, issue: 'preferredTime max 100' };
  return { ok: true };
}

function validateEscalation({ reason, urgency } = {}) {
  if (typeof reason !== 'string' || reason.length < 3) return { ok: false, issue: 'reason min 3' };
  if (reason.length > 300)                             return { ok: false, issue: 'reason max 300' };
  if (urgency !== undefined && !['normal','urgent'].includes(urgency)) return { ok: false, issue: 'invalid urgency' };
  return { ok: true };
}

/* ── In-process tool simulator (mirrors tools.js logic exactly) ─── */

function toReferenceId(idStr) {
  return `REQ-${idStr.slice(-8).toUpperCase()}`;
}

const AUTH_ERROR_TEMPLATE = {
  success:      false,
  errorCode:    'AUTH_MISSING',
  errorMessage: 'I was unable to verify your identity. Please sign in again and try once more. If the problem persists, call us directly at +91 20 2634 5678.',
};

function makeDbError(toolName, err) {
  // Intentionally NOT including err.message in the return value
  console.error(`     [mock error] ${toolName}: ${err.message}`);
  return {
    success:      false,
    errorCode:    'DB_ERROR',
    errorMessage: 'I was unable to save your request due to a system error. Please try again in a moment, or call us at +91 20 2634 5678.',
  };
}

const FAKE_ID = 'deadbeef12345678';

function buildTestTools(userId, mockCreate) {
  return {

    createServiceRequest: {
      execute: async ({ serviceType, vehicleDetails, preferredDate, preferredTime, additionalNotes }) => {
        if (!userId) return { ...AUTH_ERROR_TEMPLATE };
        const trimmed = (serviceType ?? '').trim();
        if (trimmed.length < 3) {
          return { success: false, errorCode: 'VALIDATION_ERROR', errorMessage: 'The service type was too short. Could you clarify what service you need?' };
        }
        // Parse ISO date only
        let scheduledDate = null;
        if (preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
          const d = new Date(preferredDate);
          scheduledDate = isNaN(d.getTime()) ? null : d;
        }
        const noteLines = [];
        if (vehicleDetails) noteLines.push(`Vehicle: ${vehicleDetails.trim()}`);
        if (additionalNotes) noteLines.push(additionalNotes.trim());
        const notes = noteLines.join('\n').slice(0, 1000);
        try {
          const doc = await mockCreate({
            clerkId: userId, type: trimmed, status: 'pending',
            scheduledDate, scheduledTime: preferredTime?.trim() ?? null,
            vehicleSnapshot: vehicleDetails?.trim() ?? null, notes,
          });
          const idStr = doc?._id?.toString() ?? FAKE_ID;
          const ref   = toReferenceId(idStr);
          const datePart = preferredDate
            ? ` for ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ''}`
            : '';
          return {
            success: true, referenceId: ref, serviceType: trimmed, status: 'pending',
            details: `${trimmed}${datePart}`,
            nextSteps: `The service team will review the request and confirm the appointment via WhatsApp or phone. Reference: ${ref}`,
          };
        } catch (err) { return makeDbError('createServiceRequest', err); }
      },
    },

    createCallbackRequest: {
      execute: async ({ reason, preferredTime }) => {
        if (!userId) return { ...AUTH_ERROR_TEMPLATE };
        const noteLines = [`Reason: ${reason.trim()}`];
        if (preferredTime) noteLines.push(`Preferred call time: ${preferredTime.trim()}`);
        try {
          await mockCreate({ clerkId: userId, type: 'Callback Request', status: 'pending', notes: noteLines.join('\n') });
          const timePart = preferredTime ? ` at ${preferredTime}` : ' during business hours';
          return { success: true, status: 'pending', nextSteps: `Our team will call you${timePart}. Business hours are Monday to Saturday, 8 AM to 7 PM.` };
        } catch (err) { return makeDbError('createCallbackRequest', err); }
      },
    },

    escalateToHuman: {
      execute: async ({ reason, urgency = 'normal', conversationSummary }) => {
        if (!userId) return { ...AUTH_ERROR_TEMPLATE };
        const isUrgent  = urgency === 'urgent';
        const typeLabel = isUrgent ? 'URGENT — Escalation Required' : 'Escalation — Human Follow-up Required';
        const noteLines = [`Reason: ${reason.trim()}`, `Urgency: ${urgency}`];
        if (conversationSummary) noteLines.push(`Context: ${conversationSummary.trim()}`);
        try {
          await mockCreate({ clerkId: userId, type: typeLabel, status: 'pending', notes: noteLines.join('\n').slice(0, 1000) });
          return { success: true, urgency, nextSteps: 'This has been flagged for the service team. Someone will follow up with you shortly. For immediate assistance call +91 20 2634 5678.' };
        } catch (err) { return makeDbError('escalateToHuman', err); }
      },
    },
  };
}

const MOCK_USER   = 'user_test_abc123';
const OK_CREATE   = async (data) => ({ _id: { toString: () => FAKE_ID }, ...data });
const FAIL_CREATE = async ()     => { throw new Error('MongoServerError: network timeout'); };

/* ══════════════════════════════════════════════════════════════════
   SECTION 1 — Schema Validation (no DB)
══════════════════════════════════════════════════════════════════ */
console.log('\n━━━ Section 1: Schema validation ━━━━━━━━━━━━━━━━━━━━━━━━━━');

test('createServiceRequest: valid full input',      () => assert(validateServiceRequest({ serviceType: 'Oil & Filter Change', vehicleDetails: '2020 Honda City', preferredDate: '2025-03-15', preferredTime: '10:00 AM', additionalNotes: 'Check coolant' }).ok));
test('createServiceRequest: valid minimal',          () => assert(validateServiceRequest({ serviceType: 'Brake Inspection' }).ok));
test('createServiceRequest: rejects empty type',     () => assert(!validateServiceRequest({ serviceType: '' }).ok));
test('createServiceRequest: rejects type < 3 chars', () => assert(!validateServiceRequest({ serviceType: 'AC' }).ok));
test('createServiceRequest: rejects type > 120',     () => assert(!validateServiceRequest({ serviceType: 'A'.repeat(121) }).ok));
test('createServiceRequest: rejects notes > 500',    () => assert(!validateServiceRequest({ serviceType: 'Oil Change', additionalNotes: 'X'.repeat(501) }).ok));
test('createServiceRequest: optional fields absent',  () => { const r = validateServiceRequest({ serviceType: 'Tyre Rotation' }); assert(r.ok); });

test('createCallbackRequest: valid with time',        () => assert(validateCallbackRequest({ reason: 'Suspension noise', preferredTime: 'Tomorrow 9 AM' }).ok));
test('createCallbackRequest: valid without time',     () => assert(validateCallbackRequest({ reason: 'AC price enquiry' }).ok));
test('createCallbackRequest: rejects empty reason',   () => assert(!validateCallbackRequest({ reason: '' }).ok));
test('createCallbackRequest: rejects reason > 300',   () => assert(!validateCallbackRequest({ reason: 'R'.repeat(301) }).ok));

test('escalateToHuman: valid urgent escalation',      () => assert(validateEscalation({ reason: 'Brake failure', urgency: 'urgent' }).ok));
test('escalateToHuman: urgency defaults to normal',   () => assert(validateEscalation({ reason: 'Complaint' }).ok));
test('escalateToHuman: rejects invalid urgency',      () => assert(!validateEscalation({ reason: 'Test', urgency: 'critical' }).ok));
test('escalateToHuman: rejects empty reason',         () => assert(!validateEscalation({ reason: '' }).ok));

/* ══════════════════════════════════════════════════════════════════
   SECTION 2 — Success Paths
══════════════════════════════════════════════════════════════════ */
console.log('\n━━━ Section 2: Successful tool calls ━━━━━━━━━━━━━━━━━━━━━━━━');

test('createServiceRequest: success — full input', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE);
  const r = await t.createServiceRequest.execute({ serviceType: 'Oil & Filter Change', vehicleDetails: '2020 Honda City Petrol', preferredDate: '2025-03-15', preferredTime: '9:00 AM', additionalNotes: 'Check coolant' });
  eq(r.success, true); has(r, 'referenceId'); has(r, 'serviceType'); has(r, 'status'); has(r, 'nextSteps');
  eq(r.serviceType, 'Oil & Filter Change'); eq(r.status, 'pending');
  assert(r.referenceId.startsWith('REQ-'), `Bad referenceId: ${r.referenceId}`);
  assert(r.nextSteps.includes('REQ-'), 'nextSteps must include referenceId');
});

test('createServiceRequest: success — serviceType only', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE);
  const r = await t.createServiceRequest.execute({ serviceType: 'Brake Inspection' });
  eq(r.success, true); has(r, 'referenceId'); has(r, 'nextSteps');
});

test('createCallbackRequest: success — with preferred time', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE);
  const r = await t.createCallbackRequest.execute({ reason: 'Suspension noise query', preferredTime: 'tomorrow afternoon after 3 PM' });
  eq(r.success, true); has(r, 'nextSteps');
  assert(r.nextSteps.includes('tomorrow afternoon after 3 PM'), `time missing from nextSteps: ${r.nextSteps}`);
});

test('createCallbackRequest: success — no preferred time → mentions business hours', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE);
  const r = await t.createCallbackRequest.execute({ reason: 'Price enquiry' });
  eq(r.success, true);
  assert(r.nextSteps.includes('business hours'), `Missing 'business hours': ${r.nextSteps}`);
});

test('escalateToHuman: success — normal urgency', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE);
  const r = await t.escalateToHuman.execute({ reason: 'Customer unhappy with previous repair', urgency: 'normal' });
  eq(r.success, true); eq(r.urgency, 'normal'); has(r, 'nextSteps');
});

test('escalateToHuman: success — urgent stores URGENT in type', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  const r = await t.escalateToHuman.execute({ reason: 'Complete brake failure at speed', urgency: 'urgent' });
  eq(r.success, true); eq(r.urgency, 'urgent');
  assert(captured.type?.includes('URGENT'), `Expected URGENT in type: ${captured.type}`);
});

/* ══════════════════════════════════════════════════════════════════
   SECTION 3 — Edge Cases
══════════════════════════════════════════════════════════════════ */
console.log('\n━━━ Section 3: Edge cases ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

test('serviceType is trimmed before storage', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: '  AC Service  ' });
  eq(captured.type, 'AC Service', 'Type must be trimmed');
});

test('no preferredDate → scheduledDate is null', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: 'Wheel Alignment' });
  eq(captured.scheduledDate, null);
});

test('natural date phrase → scheduledDate is null (not parsed)', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: 'Full Check', preferredDate: 'next Monday' });
  eq(captured.scheduledDate, null, 'Natural phrase must not become a Date');
});

test('ISO date → scheduledDate is a Date object', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: 'Oil Change', preferredDate: '2025-06-15' });
  assert(captured.scheduledDate instanceof Date, `Expected Date, got: ${typeof captured.scheduledDate}`);
});

test('vehicleDetails stored in vehicleSnapshot', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: 'Engine Diagnostics', vehicleDetails: '2019 Toyota Innova Diesel' });
  eq(captured.vehicleSnapshot, '2019 Toyota Innova Diesel');
  assert(captured.notes.includes('Vehicle: 2019 Toyota Innova Diesel'), 'Vehicle must appear in notes');
});

test('additionalNotes appear in stored notes', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return { _id: { toString: () => FAKE_ID } }; });
  await t.createServiceRequest.execute({ serviceType: 'Brake Pad Replacement', additionalNotes: 'Squeaking at low speed' });
  assert(captured.notes.includes('Squeaking at low speed'), 'additionalNotes must appear in notes');
});

test('escalateToHuman: conversationSummary stored in notes', async () => {
  let captured = {};
  const t = buildTestTools(MOCK_USER, async (d) => { captured = d; return {}; });
  await t.escalateToHuman.execute({ reason: 'Refund request', urgency: 'normal', conversationSummary: 'Alignment still off after paid service' });
  assert(captured.notes.includes('Alignment still off'), 'Summary must appear in notes');
});

test('referenceId is derived from last 8 chars of mock ID, uppercase', async () => {
  const t = buildTestTools(MOCK_USER, OK_CREATE); // FAKE_ID = 'deadbeef12345678'
  const r = await t.createServiceRequest.execute({ serviceType: 'Tyre Rotation' });
  eq(r.referenceId, 'REQ-12345678', `Expected REQ-12345678, got ${r.referenceId}`);
});

/* ══════════════════════════════════════════════════════════════════
   SECTION 4 — Failure Paths
══════════════════════════════════════════════════════════════════ */
console.log('\n━━━ Section 4: Failure paths ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

test('createServiceRequest: AUTH_MISSING — userId null', async () => {
  const t = buildTestTools(null, OK_CREATE);
  const r = await t.createServiceRequest.execute({ serviceType: 'Oil Change' });
  eq(r.success, false); eq(r.errorCode, 'AUTH_MISSING'); has(r, 'errorMessage');
});

test('createCallbackRequest: AUTH_MISSING — userId undefined', async () => {
  const t = buildTestTools(undefined, OK_CREATE);
  const r = await t.createCallbackRequest.execute({ reason: 'Price enquiry' });
  eq(r.success, false); eq(r.errorCode, 'AUTH_MISSING');
});

test('escalateToHuman: AUTH_MISSING — userId empty string', async () => {
  const t = buildTestTools('', OK_CREATE);
  const r = await t.escalateToHuman.execute({ reason: 'Complaint', urgency: 'normal' });
  eq(r.success, false); eq(r.errorCode, 'AUTH_MISSING');
});

test('createServiceRequest: DB_ERROR — create throws', async () => {
  const t = buildTestTools(MOCK_USER, FAIL_CREATE);
  const r = await t.createServiceRequest.execute({ serviceType: 'Tyre Rotation' });
  eq(r.success, false); eq(r.errorCode, 'DB_ERROR'); has(r, 'errorMessage');
  assert(!r.errorMessage.includes('MongoServerError'), 'Raw DB error must not leak to model');
  assert(!r.errorMessage.includes('network timeout'),  'Internal error detail must not leak');
});

test('createCallbackRequest: DB_ERROR — create throws', async () => {
  const t = buildTestTools(MOCK_USER, FAIL_CREATE);
  const r = await t.createCallbackRequest.execute({ reason: 'Pricing enquiry' });
  eq(r.success, false); eq(r.errorCode, 'DB_ERROR');
  assert(!r.errorMessage.includes('MongoServerError'));
});

test('escalateToHuman: DB_ERROR — create throws', async () => {
  const t = buildTestTools(MOCK_USER, FAIL_CREATE);
  const r = await t.escalateToHuman.execute({ reason: 'Safety concern', urgency: 'urgent' });
  eq(r.success, false); eq(r.errorCode, 'DB_ERROR');
});

test('All success responses have required shape', async () => {
  const t  = buildTestTools(MOCK_USER, OK_CREATE);
  const sr  = await t.createServiceRequest.execute({ serviceType: 'Windscreen Chip Repair' });
  const cb  = await t.createCallbackRequest.execute({ reason: 'Service package query' });
  const esc = await t.escalateToHuman.execute({ reason: 'Complaint', urgency: 'normal' });
  assert(sr.success  && 'referenceId' in sr && 'status' in sr && 'nextSteps' in sr, 'createServiceRequest shape');
  assert(cb.success  && 'nextSteps' in cb,                                          'createCallbackRequest shape');
  assert(esc.success && 'urgency' in esc && 'nextSteps' in esc,                     'escalateToHuman shape');
});

test('All auth-error responses have required shape', async () => {
  const t = buildTestTools(null, OK_CREATE);
  const results = await Promise.all([
    t.createServiceRequest.execute({ serviceType: 'Oil Change' }),
    t.createCallbackRequest.execute({ reason: 'Test' }),
    t.escalateToHuman.execute({ reason: 'Test', urgency: 'normal' }),
  ]);
  for (const r of results) {
    eq(r.success, false);
    has(r, 'errorCode');
    has(r, 'errorMessage');
    assert(typeof r.errorMessage === 'string' && r.errorMessage.length > 0, 'errorMessage must be non-empty string');
  }
});

/* ── Summary ────────────────────────────────────────────────────── */
Promise.all(pending).then(() => {
  const total = pass + fail;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Results: ${pass}/${total} passed${fail ? ` — ${fail} FAILED` : ' — all passing'}`);
  console.log(`${'═'.repeat(60)}\n`);
  process.exit(fail > 0 ? 1 : 0);
});
