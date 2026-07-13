"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

import { createStack, updateStack } from "@/lib/actions/stacks";
import {
  findInteractions,
  worstKind,
  type InteractionRow,
} from "@/lib/interactions";
import { Eyebrow } from "@/components/common/eyebrow";
import { InteractionBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOAL_TAGS, GOAL_LABELS, type GoalTag } from "@/types/peptide";

interface PeptideOption {
  id: string;
  name: string;
  slug: string;
}

interface InitialItem {
  peptideId: string;
  dose: string;
  notes: string;
}

interface InitialStack {
  id: string;
  name: string;
  goal: string;
  description: string;
  items: InitialItem[];
}

interface Props {
  peptides: PeptideOption[];
  interactionRows: InteractionRow[];
  /** Present in edit mode — prefills the form and switches the submit to updateStack. */
  stack?: InitialStack;
  /** Preselect this peptide (deep-link from the peptide detail page). */
  initialPeptideId?: string;
}

export function StackBuilder({
  peptides,
  interactionRows,
  stack,
  initialPeptideId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        stack?.items.map((i) => i.peptideId) ??
          (initialPeptideId && peptides.some((p) => p.id === initialPeptideId)
            ? [initialPeptideId]
            : []),
      ),
  );
  const [name, setName] = useState(stack?.name ?? "");
  const [goal, setGoal] = useState<GoalTag | "">(
    (stack?.goal as GoalTag | "") ?? "",
  );
  const [description, setDescription] = useState(stack?.description ?? "");
  const [doseById, setDoseById] = useState<Record<string, string>>(() =>
    Object.fromEntries((stack?.items ?? []).map((i) => [i.peptideId, i.dose])),
  );
  const [notesById, setNotesById] = useState<Record<string, string>>(() =>
    Object.fromEntries((stack?.items ?? []).map((i) => [i.peptideId, i.notes])),
  );

  function togglePeptide(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedArr = Array.from(selectedIds);
  const activeInteractions = findInteractions(selectedArr, interactionRows);
  const worst = worstKind(activeInteractions);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const slug = stack
          ? await updateStack(stack.id, formData)
          : await createStack(formData);
        toast.success(stack ? "Stack updated!" : "Stack created!");
        router.push(`/stacks/${slug}`);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${stack ? "update" : "create"} stack.`,
        );
      }
    });
  }

  const worstColor =
    worst === "avoid"
      ? "border-red-500/40 bg-red-500/10"
      : worst === "caution"
        ? "border-amber-500/40 bg-amber-500/10"
        : worst === "synergy"
          ? "border-indigo-500/40 bg-indigo-500/10"
          : "border-border bg-muted/30";

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Stack metadata */}
      <section className="space-y-4">
        <Eyebrow>STACK DETAILS</Eyebrow>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recovery Protocol"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="goal" className="text-sm font-medium">
              Goal
            </label>
            <Select
              name="goal"
              value={goal}
              onValueChange={(v) => setGoal(v as GoalTag | "")}
            >
              <SelectTrigger id="goal">
                <SelectValue placeholder="— Select a goal —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Select a goal —</SelectItem>
                {GOAL_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {GOAL_LABELS[tag]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose and context of this stack…"
            className="resize-none"
            maxLength={1000}
          />
        </div>
      </section>

      {/* Peptide picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <Eyebrow>SELECT PEPTIDES</Eyebrow>
            <span className="num text-muted-foreground text-xs">
              {selectedIds.size} selected
            </span>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {peptides.map((p) => {
            const checked = selectedIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3 text-sm transition-colors ${
                  checked
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="peptideIds"
                    value={p.id}
                    checked={checked}
                    onChange={() => togglePeptide(p.id)}
                    className="accent-primary size-4 shrink-0 rounded"
                  />
                  <span className="font-medium">{p.name}</span>
                </label>
                {checked && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 pl-7">
                    <div className="space-y-1">
                      <label
                        htmlFor={`dose-${p.id}`}
                        className="text-muted-foreground text-xs"
                      >
                        Dose
                      </label>
                      <Input
                        id={`dose-${p.id}`}
                        name={`dose:${p.id}`}
                        value={doseById[p.id] ?? ""}
                        onChange={(e) =>
                          setDoseById((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        placeholder="e.g. 250 mcg"
                        maxLength={40}
                        className="rounded-md px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`notes-${p.id}`}
                        className="text-muted-foreground text-xs"
                      >
                        Notes
                      </label>
                      <Input
                        id={`notes-${p.id}`}
                        name={`notes:${p.id}`}
                        value={notesById[p.id] ?? ""}
                        onChange={(e) =>
                          setNotesById((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        placeholder="optional"
                        maxLength={80}
                        className="rounded-md px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Live interaction warnings */}
      {selectedIds.size >= 2 && (
        <section className="space-y-3">
          <Eyebrow>INTERACTION CHECK</Eyebrow>
          {activeInteractions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
              <CheckCircle2 className="size-4 shrink-0" />
              No known interactions among the selected peptides.
            </div>
          ) : (
            <div className={`space-y-2 rounded-xl border p-4 ${worstColor}`}>
              {worst === "avoid" && (
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  Warning: combination contains peptides that should be avoided
                  together.
                </div>
              )}
              {worst === "caution" && (
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0" />
                  Caution: some interactions require care.
                </div>
              )}
              {activeInteractions.map((row, i) => {
                const aName =
                  peptides.find((p) => p.id === row.peptideAId)?.name ??
                  row.peptideAId;
                const bName =
                  peptides.find((p) => p.id === row.peptideBId)?.name ??
                  row.peptideBId;
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
                  >
                    <InteractionBadge kind={row.kind} />
                    <p className="text-sm">
                      <span className="font-medium">
                        {aName} × {bName}
                      </span>
                      {row.note && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {row.note}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Submit */}
      <div className="border-border flex items-center gap-3 border-t pt-4">
        <Button
          type="submit"
          disabled={isPending || selectedIds.size === 0 || !name.trim()}
          className="btn-gradient"
        >
          {isPending
            ? stack
              ? "Saving…"
              : "Creating…"
            : stack
              ? "Save Changes"
              : "Create Stack"}
        </Button>
        {worst === "avoid" && (
          <p className="text-destructive text-xs">
            Avoid combination detected — you may still save, but proceed with
            caution.
          </p>
        )}
      </div>
    </form>
  );
}
