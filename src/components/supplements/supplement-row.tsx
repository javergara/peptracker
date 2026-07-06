"use client";

import { useTransition, useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";

import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogIntakeButton } from "@/components/supplements/log-intake-button";
import { updateSupplement, deleteSupplement } from "@/lib/actions/supplements";
import type { SupplementAdherence } from "@/lib/queries";

const CATEGORIES = [
  "vitamin",
  "mineral",
  "omega",
  "amino",
  "herbal",
  "other",
] as const;

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    vitamin: "Vitamin",
    mineral: "Mineral",
    omega: "Omega",
    amino: "Amino Acid",
    herbal: "Herbal",
    other: "Other",
  };
  return map[cat] ?? cat;
}

// Value→label maps so the base-ui Select trigger shows the label, not the value.
const CATEGORY_ITEMS: Record<string, string> = {
  "": "— None —",
  ...Object.fromEntries(CATEGORIES.map((c) => [c, categoryLabel(c)])),
};
const STATUS_ITEMS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  stopped: "Stopped",
};

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const colorMap: Record<string, string> = {
    vitamin:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/20",
    mineral:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-400/20",
    omega: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-400/20",
    amino:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-400/20",
    herbal:
      "bg-green-500/10 text-green-700 dark:text-green-300 border-green-400/20",
    other: "bg-secondary text-secondary-foreground border-border",
  };
  const cls = colorMap[category] ?? colorMap.other;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {categoryLabel(category)}
    </span>
  );
}

export interface SupplementRowData {
  id: string;
  name: string;
  category: string | null;
  dose: string | null;
  frequency: string | null;
  timesPerDay: number | null;
  timing: string | null;
  startDate: Date;
  endDate: Date | null;
  status: string;
  notes: string | null;
}

function formatDateRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return end ? `${fmt(start)} – ${fmt(end)}` : `Since ${fmt(start)}`;
}

function toDateValue(d: Date): string {
  // yyyy-MM-dd in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SupplementRow({
  supplement,
  accentColor,
  adherence,
}: {
  supplement: SupplementRowData;
  accentColor?: string;
  /** Today/window intake progress — only present when timesPerDay is set. */
  adherence?: SupplementAdherence;
}) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const s = supplement;
  const boundUpdate = updateSupplement.bind(null, s.id);

  function handleDelete() {
    if (!confirm("Delete this supplement?")) return;
    startDelete(async () => {
      try {
        await deleteSupplement(s.id);
        toast.success("Supplement deleted");
      } catch {
        toast.error("Failed to delete supplement");
      }
    });
  }

  const isInactive = s.status === "paused" || s.status === "stopped";

  return (
    <div
      className={`px-5 py-4 transition-opacity first:rounded-t-2xl last:rounded-b-2xl ${
        isInactive ? "opacity-60" : ""
      }`}
    >
      {!editing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {accentColor ? (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accentColor }}
                />
              ) : null}
              <span className="font-medium">{s.name}</span>
              <CategoryBadge category={s.category} />
              {s.status !== "active" && (
                <span className="text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">
                  {s.status}
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {s.dose || s.frequency ? (
                <span className="num">
                  {[s.dose, s.frequency].filter(Boolean).join(" · ")}
                </span>
              ) : null}
              <span className="text-muted-foreground/60">·</span>
              <span className="num">
                {formatDateRange(s.startDate, s.endDate)}
              </span>
            </div>
            {s.timing ? (
              <p className="text-muted-foreground text-xs">{s.timing}</p>
            ) : null}
            {s.notes ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {s.notes}
              </p>
            ) : null}
            {adherence && s.status === "active" ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-accent h-1.5 w-24 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full [background:var(--gradient-gauge)]"
                      style={{
                        width: `${
                          adherence.expectedToday > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (adherence.takenToday /
                                    adherence.expectedToday) *
                                    100,
                                ),
                              )
                            : 0
                        }%`,
                      }}
                      role="progressbar"
                      aria-valuenow={adherence.takenToday}
                      aria-valuemin={0}
                      aria-valuemax={adherence.expectedToday}
                    />
                  </div>
                  <span className="num text-muted-foreground text-xs">
                    today {adherence.takenToday}/{adherence.expectedToday}
                  </span>
                </div>
                <LogIntakeButton
                  supplementId={s.id}
                  accentColor={accentColor}
                />
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${s.name}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${s.name}`}
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Edit supplement</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel edit"
              onClick={() => setEditing(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <ActionForm
            action={async (fd) => {
              await boundUpdate(fd);
              setEditing(false);
            }}
            success="Supplement updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label htmlFor={`name-${s.id}`} className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id={`name-${s.id}`}
                name="name"
                required
                defaultValue={s.name}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`category-${s.id}`}
                className="text-sm font-medium"
              >
                Category
              </label>
              <Select
                name="category"
                defaultValue={s.category ?? ""}
                items={CATEGORY_ITEMS}
              >
                <SelectTrigger id={`category-${s.id}`}>
                  <SelectValue placeholder="— None —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`dose-${s.id}`} className="text-sm font-medium">
                Dose
              </label>
              <Input
                id={`dose-${s.id}`}
                name="dose"
                defaultValue={s.dose ?? ""}
                placeholder="e.g. 5 g"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`frequency-${s.id}`}
                className="text-sm font-medium"
              >
                Frequency
              </label>
              <Input
                id={`frequency-${s.id}`}
                name="frequency"
                defaultValue={s.frequency ?? ""}
                placeholder="e.g. daily"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`timesPerDay-${s.id}`}
                className="text-sm font-medium"
              >
                Times per day{" "}
                <span className="text-muted-foreground font-normal">
                  — optional
                </span>
              </label>
              <Input
                id={`timesPerDay-${s.id}`}
                name="timesPerDay"
                type="number"
                min={1}
                max={12}
                step={1}
                defaultValue={s.timesPerDay ?? ""}
                placeholder="e.g. 2"
                className="num"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`timing-${s.id}`} className="text-sm font-medium">
                Timing
              </label>
              <Input
                id={`timing-${s.id}`}
                name="timing"
                defaultValue={s.timing ?? ""}
                placeholder="e.g. morning, with food"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`startDate-${s.id}`}
                className="text-sm font-medium"
              >
                Start date
              </label>
              <Input
                id={`startDate-${s.id}`}
                name="startDate"
                type="date"
                defaultValue={toDateValue(s.startDate)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`endDate-${s.id}`}
                className="text-sm font-medium"
              >
                End date
              </label>
              <Input
                id={`endDate-${s.id}`}
                name="endDate"
                type="date"
                defaultValue={s.endDate ? toDateValue(s.endDate) : ""}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`status-${s.id}`} className="text-sm font-medium">
                Status
              </label>
              <Select
                name="status"
                defaultValue={s.status}
                items={STATUS_ITEMS}
              >
                <SelectTrigger id={`status-${s.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor={`notes-${s.id}`} className="text-sm font-medium">
                Notes
              </label>
              <Input
                id={`notes-${s.id}`}
                name="notes"
                defaultValue={s.notes ?? ""}
                placeholder="optional"
                maxLength={280}
              />
            </div>
            <div className="flex items-end gap-2">
              <SubmitButton size="sm">
                <Check className="size-3.5" />
                Save
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
