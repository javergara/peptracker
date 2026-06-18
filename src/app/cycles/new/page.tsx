import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createCycle } from "@/lib/actions/cycles";
import { listPeptides, listStacks } from "@/lib/queries";
import { CYCLE_STATUSES } from "@/types/peptide";

export const metadata = { title: "New Cycle" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function NewCyclePage() {
  const [peptides, stacks] = await Promise.all([listPeptides(), listStacks()]);

  async function action(formData: FormData) {
    "use server";
    const id = await createCycle(formData);
    redirect(`/cycles/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Cycle"
        description="Track a protocol built from a single peptide or a stack."
        actions={
          <Button variant="outline" render={<Link href="/cycles" />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="e.g. Recovery block"
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="source" className="text-sm font-medium">
                Based on <span className="text-destructive">*</span>
              </label>
              <select id="source" name="source" required className={inputCls}>
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
                  defaultValue="active"
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
                  defaultValue="daily"
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
                  defaultValue="mcg"
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
                className={`${inputCls} resize-none`}
              />
            </div>

            <Button type="submit">Create cycle</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
