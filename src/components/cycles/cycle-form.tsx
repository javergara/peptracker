import { Button } from "@/components/ui/button";
import { CYCLE_STATUSES } from "@/types/peptide";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export interface CycleFormDefaults {
  name?: string;
  /** "peptide:<id>" | "stack:<id>" */
  source?: string;
  startDate?: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd
  status?: string;
  frequency?: string;
  dosePerAdmin?: number | string;
  unit?: string;
  notes?: string;
}

/**
 * Shared create/edit form for a cycle. Stateless server component — pass a
 * server `action` and optional `defaults` to prefill (edit mode).
 */
export function CycleForm({
  peptides,
  stacks,
  action,
  submitLabel,
  defaults = {},
}: {
  peptides: { id: string; name: string }[];
  stacks: { id: string; name: string }[];
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: CycleFormDefaults;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaults.name}
          placeholder="e.g. Recovery block"
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="source" className="text-sm font-medium">
          Based on <span className="text-destructive">*</span>
        </label>
        <select
          id="source"
          name="source"
          required
          defaultValue={defaults.source ?? ""}
          className={inputCls}
        >
          <option value="" disabled>
            — Select —
          </option>
          <optgroup label="Peptides">
            {peptides.map((p) => (
              <option key={p.id} value={`peptide:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Stacks">
            {stacks.map((s) => (
              <option key={s.id} value={`stack:${s.id}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="startDate" className="text-sm font-medium">
            Start date <span className="text-destructive">*</span>
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={defaults.startDate}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="endDate" className="text-sm font-medium">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaults.endDate}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaults.status ?? "active"}
            className={inputCls}
          >
            {CYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="frequency" className="text-sm font-medium">
            Frequency
          </label>
          <select
            id="frequency"
            name="frequency"
            defaultValue={defaults.frequency ?? "daily"}
            className={inputCls}
          >
            <option value="daily">Daily</option>
            <option value="eod">Every other day</option>
            <option value="twice-weekly">Twice weekly</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="dosePerAdmin" className="text-sm font-medium">
            Dose per administration
          </label>
          <input
            id="dosePerAdmin"
            name="dosePerAdmin"
            type="number"
            step="any"
            min="0"
            defaultValue={defaults.dosePerAdmin}
            placeholder="e.g. 250"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="unit" className="text-sm font-medium">
            Unit
          </label>
          <select
            id="unit"
            name="unit"
            defaultValue={defaults.unit ?? "mcg"}
            className={inputCls}
          >
            <option value="mcg">mcg</option>
            <option value="mg">mg</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          className={`${inputCls} resize-none`}
        />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
