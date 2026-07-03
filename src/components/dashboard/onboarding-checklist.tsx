import Link from "next/link";
import { Check, Circle, Sparkles } from "lucide-react";

import { Eyebrow } from "@/components/common/eyebrow";
import { cn } from "@/lib/utils";

export interface OnboardingStatus {
  hasSupply: boolean;
  hasCycle: boolean;
  hasDose: boolean;
  hasBaseline: boolean;
  hasPhoto: boolean;
}

interface Step {
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

/**
 * Guided first-run checklist. Rendered by the dashboard only while the account
 * is getting started (the page skips it — and its extra count queries — once
 * cycles + doses exist).
 */
export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const steps: Step[] = [
    {
      label: "Add your supply",
      hint: "Register a vial or stock so doses can draw from it",
      href: "/inventory",
      done: status.hasSupply,
    },
    {
      label: "Start a cycle",
      hint: "Pick a peptide or stack and set the schedule",
      href: "/cycles/new",
      done: status.hasCycle,
    },
    {
      label: "Log your first dose",
      hint: "One tap from the dashboard once a cycle is active",
      href: "/log",
      done: status.hasDose,
    },
    {
      label: "Record a baseline",
      hint: "Weight or bloodwork — trends need a starting point",
      href: "/metrics",
      done: status.hasBaseline,
    },
    {
      label: "Take a progress photo",
      hint: "Private, and future-you will thank you",
      href: "/photos",
      done: status.hasPhoto,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="card-surface mb-[18px] rounded-[18px] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary size-4" />
          <Eyebrow>Getting started</Eyebrow>
        </div>
        <span className="num text-muted-foreground text-xs">
          {done} of {steps.length}
        </span>
      </div>

      {/* Progress */}
      <div className="bg-accent mb-4 h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full [background:var(--gradient-gauge)]"
          style={{ width: `${(done / steps.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
        />
      </div>

      <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={cn(
                "focus-visible:ring-ring block rounded-[12px] border p-3 outline-none focus-visible:ring-2",
                s.done
                  ? "border-ok/25 bg-ok-wash/50"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="flex items-center gap-1.5">
                {s.done ? (
                  <Check
                    className="text-ok size-3.5 shrink-0"
                    strokeWidth={3}
                  />
                ) : (
                  <Circle className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-[13px] font-medium",
                    s.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {s.label}
                </span>
              </span>
              {!s.done ? (
                <span className="text-muted-foreground mt-1 block text-xs">
                  {s.hint}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
