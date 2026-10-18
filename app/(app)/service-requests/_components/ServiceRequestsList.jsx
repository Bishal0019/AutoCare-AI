'use client';

/**
 * ServiceRequestsList — interactive client component for the service-requests page.
 *
 * Responsibilities:
 *   - Renders the list of service requests received from the Server Component.
 *   - Shows Reschedule + Delete buttons on eligible rows.
 *   - Reschedule is shown for pending and scheduled bookings.
 *   - Delete is shown for pending bookings only.
 *   - Manages in-page dialogs — no browser confirm() or alert().
 *   - Disables action buttons while a request is in flight.
 *   - Updates local state immediately after server confirms success.
 *
 * Rescheduling eligibility:
 *   - Allowed statuses: 'pending', 'scheduled'
 *   - Date must be today or in the future (validated client + server)
 *   - Appointment time is a free-text field matching existing schema
 *
 * Supported appointment time slots (matching typical service-centre hours):
 *   08:00 AM, 09:00 AM … 05:00 PM
 */

import { useState, useCallback, useRef } from 'react';
import {
  CheckCircle2, Circle, Wrench,
  Trash2, CalendarClock, AlertTriangle, X, Loader2,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

/* ── Constants ───────────────────────────────────────────────────── */

const STATUS_META = {
  pending:     { label: 'Pending',     variant: 'warning', dot: true  },
  scheduled:   { label: 'Scheduled',   variant: 'info',    dot: true  },
  in_progress: { label: 'In Progress', variant: 'accent',  dot: true  },
  completed:   { label: 'Completed',   variant: 'success', dot: false },
  cancelled:   { label: 'Cancelled',   variant: 'default', dot: false },
};

// Statuses the customer may reschedule
const RESCHEDULE_ELIGIBLE = new Set(['pending', 'scheduled']);

// Time slots available for scheduling (mirrors service-centre business hours)
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM',
];

/** ISO date string for today in local time (YYYY-MM-DD). */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Convert a stored Date string → "YYYY-MM-DD" for an <input type="date"> */
function toInputDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/* ── Shared: dialog backdrop ─────────────────────────────────────── */
function Backdrop({ children, labelId }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      {children}
    </div>
  );
}

/* ── Delete confirmation dialog ──────────────────────────────────── */
function DeleteDialog({ request, onCancel, onConfirm, isDeleting, errorMsg }) {
  return (
    <Backdrop labelId="delete-dialog-title">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
          <div>
            <h2 id="delete-dialog-title" className="text-sm font-semibold text-zinc-900">
              Delete pending service?
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              This will permanently remove the request. You cannot undo this action.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="ml-3 flex-shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Request summary */}
        <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
          <p className="text-sm font-medium text-zinc-800 truncate">{request.type}</p>
          {request.scheduledDate && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {formatDate(request.scheduledDate)}
              {request.scheduledTime ? ` at ${request.scheduledTime}` : ''}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md text-sm font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ── Reschedule dialog ───────────────────────────────────────────── */
function RescheduleDialog({ request, onCancel, onConfirm, isSubmitting, errorMsg }) {
  const [newDate, setNewDate]   = useState(toInputDate(request.scheduledDate));
  const [newTime, setNewTime]   = useState(request.scheduledTime ?? '');
  const [clientErr, setClientErr] = useState('');

  const today = todayISO();

  function handleSubmit(e) {
    e.preventDefault();
    setClientErr('');

    if (!newDate) {
      setClientErr('Please select a new appointment date.');
      return;
    }
    if (newDate < today) {
      setClientErr('The appointment date cannot be in the past.');
      return;
    }
    onConfirm({ scheduledDate: newDate, scheduledTime: newTime || null });
  }

  const displayError = errorMsg || clientErr;

  return (
    <Backdrop labelId="reschedule-dialog-title">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
          <div>
            <h2 id="reschedule-dialog-title" className="text-sm font-semibold text-zinc-900">
              Reschedule appointment
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Choose a new date and time for this service booking.
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="ml-3 flex-shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current booking summary */}
        <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
          <p className="text-sm font-medium text-zinc-800 truncate">{request.type}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {request.scheduledDate
              ? `Currently: ${formatDate(request.scheduledDate)}${request.scheduledTime ? ` at ${request.scheduledTime}` : ''}`
              : 'No date currently set'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Date picker */}
          <div>
            <label
              htmlFor="reschedule-date"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              New appointment date <span className="text-red-500">*</span>
            </label>
            <input
              id="reschedule-date"
              type="date"
              required
              min={today}
              value={newDate}
              onChange={e => { setClientErr(''); setNewDate(e.target.value); }}
              disabled={isSubmitting}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Time selector */}
          <div>
            <label
              htmlFor="reschedule-time"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Preferred time <span className="text-xs font-normal text-zinc-400">(optional)</span>
            </label>
            <select
              id="reschedule-time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">No preference</option>
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>

          {/* Error */}
          {displayError && (
            <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">{displayError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md text-sm font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rescheduling…
                </>
              ) : (
                <>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}

/* ── Main list component ─────────────────────────────────────────── */
export default function ServiceRequestsList({ initialRequests }) {
  const [requests, setRequests]           = useState(initialRequests);

  // Delete state
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState(null);

  // Reschedule state
  const [pendingReschedule, setPendingReschedule] = useState(null);
  const [isRescheduling, setIsRescheduling]       = useState(false);
  const [rescheduleError, setRescheduleError]     = useState(null);

  // Inline success toast (disappears after 3 s)
  const [successMsg, setSuccessMsg]   = useState(null);
  const successTimer = useRef(null);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3000);
  }

  /* ── Delete ─────────────────────────────────────────────────── */
  const openDeleteDialog = useCallback((req) => {
    setDeleteError(null);
    setPendingDelete(req);
  }, []);

  const cancelDelete = useCallback(() => {
    if (isDeleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/service-requests/${pendingDelete._id}`, {
        method: 'DELETE',
      });

      if (res.status === 204) {
        setRequests(prev => prev.filter(r => r._id !== pendingDelete._id));
        setPendingDelete(null);
        showSuccess('Booking deleted.');
      } else {
        const body = await res.json().catch(() => ({}));
        setDeleteError(
          body.error ?? `Could not delete the request (HTTP ${res.status}). Please try again.`
        );
      }
    } catch {
      setDeleteError('Network error. Please check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete, isDeleting]);

  /* ── Reschedule ─────────────────────────────────────────────── */
  const openRescheduleDialog = useCallback((req) => {
    setRescheduleError(null);
    setPendingReschedule(req);
  }, []);

  const cancelReschedule = useCallback(() => {
    if (isRescheduling) return;
    setPendingReschedule(null);
    setRescheduleError(null);
  }, [isRescheduling]);

  const confirmReschedule = useCallback(async ({ scheduledDate, scheduledTime }) => {
    if (!pendingReschedule || isRescheduling) return;
    setIsRescheduling(true);
    setRescheduleError(null);

    try {
      const res = await fetch(`/api/service-requests/${pendingReschedule._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action: 'reschedule',
          scheduledDate,
          scheduledTime,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.request) {
        // Update the specific record in local state
        setRequests(prev =>
          prev.map(r => r._id === pendingReschedule._id ? data.request : r)
        );
        setPendingReschedule(null);
        showSuccess('Appointment rescheduled successfully.');
      } else {
        setRescheduleError(
          data.error ?? `Could not reschedule the booking (HTTP ${res.status}). Please try again.`
        );
      }
    } catch {
      setRescheduleError('Network error. Please check your connection and try again.');
    } finally {
      setIsRescheduling(false);
    }
  }, [pendingReschedule, isRescheduling]);

  if (requests.length === 0) {
    return null; // Server Component renders the empty state
  }

  return (
    <>
      {/* Delete dialog */}
      {pendingDelete && (
        <DeleteDialog
          request={pendingDelete}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
          errorMsg={deleteError}
        />
      )}

      {/* Reschedule dialog */}
      {pendingReschedule && (
        <RescheduleDialog
          request={pendingReschedule}
          onCancel={cancelReschedule}
          onConfirm={confirmReschedule}
          isSubmitting={isRescheduling}
          errorMsg={rescheduleError}
        />
      )}

      {/* Inline success toast */}
      {successMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-2.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 font-medium">{successMsg}</p>
        </div>
      )}

      <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
        {requests.map((req, i) => {
          const meta = STATUS_META[req.status] ?? STATUS_META.pending;
          const canDelete    = req.status === 'pending';
          const canReschedule = RESCHEDULE_ELIGIBLE.has(req.status);

          return (
            <div
              key={req._id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i < requests.length - 1 ? 'border-b border-zinc-100' : ''
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {req.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : req.status === 'cancelled' ? (
                  <Circle className="w-4 h-4 text-zinc-300" />
                ) : (
                  <Wrench className="w-4 h-4 text-zinc-400" />
                )}
              </div>

              {/* Request details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{req.type}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {req.scheduledDate
                    ? `${formatDate(req.scheduledDate)}${req.scheduledTime ? ` at ${req.scheduledTime}` : ''}${req.bay ? ` · ${req.bay}` : ''}`
                    : `Created ${formatDate(req.createdAt)}`}
                </p>
                {req.notes && (
                  <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-sm">{req.notes}</p>
                )}
              </div>

              {/* Right side: cost · badge · actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {req.estimatedCost != null && (
                  <span className="text-xs text-zinc-500 mr-1">
                    ₹{req.estimatedCost.toLocaleString('en-IN')}
                  </span>
                )}

                <Badge variant={meta.variant} dot={meta.dot}>{meta.label}</Badge>

                {/* Reschedule button — pending and scheduled */}
                {canReschedule && (
                  <button
                    onClick={() => openRescheduleDialog(req)}
                    title="Reschedule appointment"
                    aria-label={`Reschedule: ${req.type}`}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete button — pending only */}
                {canDelete && (
                  <button
                    onClick={() => openDeleteDialog(req)}
                    title="Delete pending service request"
                    aria-label={`Delete pending service request: ${req.type}`}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
