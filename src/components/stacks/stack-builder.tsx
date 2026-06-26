"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

import { createStack } from "@/lib/actions/stacks";
import {
  findInteractions,
  worstKind,
  type InteractionRow,
} from "@/lib/interactions";
import { Eyebrow } from "@/components/common/eyebrow";
import { InteractionBadge } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { GOAL_TAGS, GOAL_LABELS, type GoalTag } from "@/types/peptide";

interface PeptideOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  peptides: PeptideOption[];
  interactionRows: InteractionRow[];
}

export function StackBuilder({ peptides, interactionRows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<GoalTag | "">("");
  const [description, setDescription] = useState("");

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
        const slug = await createStack(formData);
        toast.success("Stack created!");
        router.push(`/stacks/${slug}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create stack.",
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

  const inputCls =
    "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

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
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recovery Protocol"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="goal" className="text-sm font-medium">
              Goal
            </label>
            <select
              id="goal"
              name="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as GoalTag | "")}
              className={inputCls}
            >
              <option value="">— Select a goal —</option>
              {GOAL_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {GOAL_LABELS[tag]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the purpose and context of this stack…"
            className={`${inputCls} resize-none`}
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
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  checked
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
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
          className="[box-shadow:0_10px_22px_-10px_rgba(124,58,237,.85)] [background:linear-gradient(180deg,#8B47F0,#7C3AED)] hover:[background:linear-gradient(180deg,#9B57F0,#8C4AED)] disabled:opacity-50 disabled:[box-shadow:none]"
        >
          {isPending ? "Creating…" : "Create Stack"}
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
