import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateDose } from "@/lib/actions/doses";
import { getDoseLog, listCycles, listPeptides } from "@/lib/queries";
import { toDateTimeLocalValue } from "@/lib/dates";
import { asStringArray, ROUTES, ROUTE_LABELS } from "@/types/peptide";

export const metadata = { title: "Edit Dose" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function EditDosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dose, peptides, cycles] = await Promise.all([
    getDoseLog(id),
    listPeptides(),
    listCycles(),
  ]);
  if (!dose) notFound();

  const sideEffects = asStringArray(dose.sideEffects);

  async function action(formData: FormData) {
    "use server";
    await updateDose(id, formData);
    redirect(dose!.cycleId ? `/cycles/${dose!.cycleId}` : "/log");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Edit dose"
        description={`${dose.peptide.name} · logged ${dose.amount} ${dose.unit}`}
        actions={
          <Button
            variant="outline"
            render={
              <Link href={dose.cycleId ? `/cycles/${dose.cycleId}` : "/log"} />
            }
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Peptide <span className="text-destructive">*</span>
              </label>
              <select
                name="peptideId"
                required
                defaultValue={dose.peptideId}
                className={inputCls}
              >
                {peptides.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cycle (optional)</label>
              <select
                name="cycleId"
                defaultValue={dose.cycleId ?? ""}
                className={inputCls}
              >
                <option value="">— None —</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <input
                name="amount"
                type="number"
                step="any"
                min="0"
                required
                defaultValue={dose.amount}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <select name="unit" defaultValue={dose.unit} className={inputCls}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Route</label>
              <select
                name="route"
                defaultValue={dose.route ?? ""}
                className={inputCls}
              >
                <option value="">— Select —</option>
                {ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {ROUTE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">When</label>
              <input
                name="takenAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(dose.takenAt)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <input
                name="notes"
                defaultValue={dose.notes ?? ""}
                className={inputCls}
              />
            </div>

            <DoseFormFields
              defaults={{
                site: dose.site,
                mood: dose.mood,
                energy: dose.energy,
                sideEffects,
              }}
            />

            <div className="sm:col-span-2">
              <Button type="submit">
                <Save className="size-4" />
                Save changes
              </Button>
            </div>
          </form>

          <p className="text-muted-foreground mt-4 text-xs">
            Editing a dose updates its recorded details only — it doesn&apos;t
            re-adjust vial inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
