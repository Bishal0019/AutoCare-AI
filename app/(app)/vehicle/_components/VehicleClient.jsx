'use client';

/**
 * VehicleClient — AutoCare AI
 *
 * Manages the vehicle page's view/edit/add states.
 *
 * Props:
 *   vehicle – serialized MongoDB Vehicle document or null (no vehicle yet)
 *
 * States:
 *   no vehicle    → "Add vehicle" prompt (empty state)
 *   has vehicle   → view mode with edit button
 *   editing       → form mode
 *
 * The vehicleId hidden input on the form tells the Server Action
 * whether to create or update.
 */

import { useActionState, useState } from 'react';
import { Pencil, X, Plus, Car, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { upsertVehicle } from '@/lib/actions/vehicle';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { buttonClass } from '@/components/ui/Button';

/* ── Constants ────────────────────────────────────────────────── */

const FUEL_OPTIONS = [
  { value: 'petrol',   label: 'Petrol'   },
  { value: 'diesel',   label: 'Diesel'   },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid',   label: 'Hybrid'   },
  { value: 'cng',      label: 'CNG'      },
];

const FUEL_LABELS = Object.fromEntries(FUEL_OPTIONS.map((f) => [f.value, f.label]));

/* ── Sub-components ───────────────────────────────────────────── */

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-zinc-200" aria-hidden="true" />
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start py-2.5 border-b border-zinc-100 last:border-0">
      <dt className="w-40 text-sm text-zinc-500 flex-shrink-0 pt-px">{label}</dt>
      <dd
        className={clsx(
          'text-sm flex-1',
          value
            ? mono ? 'text-zinc-900 font-mono tracking-wide' : 'text-zinc-900'
            : 'text-zinc-400 italic',
        )}
      >
        {value || 'Not set'}
      </dd>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function VehicleClient({ vehicle }) {
  // editingOverride: null = use default logic, true = editing, false = cancelled
  const [editingOverride, setEditingOverride] = useState(null);
  const [state, formAction, pending] = useActionState(upsertVehicle, null);

  // Derive isEditing without useEffect:
  //   • After successful save: always view mode
  //   • Otherwise: respect the user's toggle (default false when vehicle exists)
  const isEditing = state?.success
    ? false
    : editingOverride !== null
      ? editingOverride
      : false;

  const v = vehicle ?? {};
  const vehicleTitle = vehicle
    ? `${v.year} ${v.manufacturer} ${v.model}`
    : null;

  /* ── Empty state ── */
  if (!vehicle && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-md bg-zinc-100 flex items-center justify-center mb-5">
          <Car className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-sm font-semibold text-zinc-950 mb-2">No vehicle registered</h2>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6 max-w-xs">
          Add your vehicle details so AutoCare AI can provide accurate service recommendations.
        </p>
        <button
          onClick={() => setEditingOverride(true)}
          className={buttonClass('accent', 'md')}
        >
          <Plus className="w-4 h-4" />
          Add vehicle
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-zinc-950 tracking-tight">
            {isEditing
              ? (vehicle ? 'Edit vehicle' : 'Add your vehicle')
              : vehicleTitle}
          </h1>
          {!isEditing && vehicle && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {FUEL_LABELS[v.fuelType] ?? v.fuelType} · {v.registrationNumber}
            </p>
          )}
        </div>

        {!isEditing && vehicle && (
          <button
            onClick={() => setEditingOverride(true)}
            className={buttonClass('secondary', 'sm')}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {/* Feedback banners */}
      {state?.success && !isEditing && (
        <div className="flex items-center gap-2 mb-5 px-3.5 py-3 rounded-md bg-green-50 border border-green-100">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{state.message}</p>
        </div>
      )}
      {state?.error && (
        <div className="flex items-center gap-2 mb-5 px-3.5 py-3 rounded-md bg-red-50 border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* ════════════════════════════════
          VIEW MODE
          ════════════════════════════════ */}
      {!isEditing && vehicle && (
        <div className="space-y-6">
          <section>
            <SectionHeader title="Vehicle Details" />
            <dl>
              <InfoRow label="Manufacturer" value={v.manufacturer} />
              <InfoRow label="Model"        value={v.model} />
              <InfoRow label="Year"         value={String(v.year)} />
              <InfoRow label="Fuel type"    value={FUEL_LABELS[v.fuelType] ?? v.fuelType} />
              <InfoRow label="Registration" value={v.registrationNumber} mono />
            </dl>
          </section>
        </div>
      )}

      {/* ════════════════════════════════
          EDIT / ADD MODE
          ════════════════════════════════ */}
      {isEditing && (
        <form
          key={v.updatedAt ?? 'new'}
          action={formAction}
          className="space-y-6"
          noValidate
        >
          {/* Hidden vehicleId — tells the action to update vs create */}
          {vehicle?._id && (
            <input type="hidden" name="vehicleId" value={String(v._id)} />
          )}

          <section>
            <SectionHeader title="Vehicle Details" />
            <div className="space-y-4">

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="manufacturer"
                  label="Manufacturer"
                  placeholder="e.g. Toyota"
                  defaultValue={v.manufacturer}
                  error={state?.errors?.manufacturer}
                  required
                />
                <Input
                  name="model"
                  label="Model"
                  placeholder="e.g. Camry"
                  defaultValue={v.model}
                  error={state?.errors?.model}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  name="year"
                  label="Year"
                  type="number"
                  placeholder={String(new Date().getFullYear())}
                  min="1886"
                  max={String(new Date().getFullYear() + 1)}
                  defaultValue={v.year}
                  error={state?.errors?.year}
                  required
                />
                <Select
                  name="fuelType"
                  label="Fuel type"
                  placeholder="Select fuel type"
                  options={FUEL_OPTIONS}
                  defaultValue={v.fuelType ?? ''}
                  error={state?.errors?.fuelType}
                />
              </div>

              <Input
                name="registrationNumber"
                label="Registration number"
                placeholder="e.g. MH-12-AB-1234"
                defaultValue={v.registrationNumber}
                error={state?.errors?.registrationNumber}
                hint="Stored in uppercase. Format varies by country."
                required
              />

            </div>
          </section>

          {/* Form actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass('accent', 'md')}
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : vehicle ? (
                'Save changes'
              ) : (
                'Add vehicle'
              )}
            </button>

            {vehicle && (
              <button
                type="button"
                onClick={() => setEditingOverride(false)}
                disabled={pending}
                className={buttonClass('ghost', 'md')}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>

        </form>
      )}

    </div>
  );
}
