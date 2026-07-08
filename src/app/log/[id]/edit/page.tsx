import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDose } from "@/lib/actions/doses";
import {
  getDoseLog,
  getDoseWeight,
  getCurrentUser,
  listCycles,
  listPeptides,
} from "@/lib/queries";
import { toDateTimeLocalValue } from "@/lib/dates";
import { asStringArray, ROUTES, ROUTE_LABELS } from "@/types/peptide";

export const metadata = { title: "Edit Dose" };
export const dynamic = "force-dynamic";

export default async function EditDosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dose, peptides, cycles, user] = await Promise.all([
    getDoseLog(id),
    listPeptides(),
    listCycles(),
    getCurrentUser(),
  ]);
  if (!dose) notFound();

  const sideEffects = asStringArray(dose.sideEffects);
  const doseWeight = await getDoseWeight(dose.takenAt);

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
          <ActionForm
            action={action}
            success="Dose updated"
            resetOnSuccess={false}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <label htmlFor="ed-peptide" className="text-sm font-medium">
                Peptide <span className="text-destructive">*</span>
              </label>
              <Select
                name="peptideId"
                defaultValue={dose.peptideId}
                required
                items={Object.fromEntries(peptides.map((p) => [p.id, p.name]))}
              >
                <SelectTrigger id="ed-peptide">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {peptides.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-cycle" className="text-sm font-medium">
                Cycle (optional)
              </label>
              <Select
                name="cycleId"
                defaultValue={dose.cycleId ?? ""}
                items={{
                  "": "— None —",
                  ...Object.fromEntries(cycles.map((c) => [c.id, c.name])),
                }}
              >
                <SelectTrigger id="ed-cycle">
                  <SelectValue placeholder="— None —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                id="ed-amount"
                name="amount"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                required
                defaultValue={dose.amount}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-unit" className="text-sm font-medium">
                Unit
              </label>
              <Select name="unit" defaultValue={dose.unit}>
                <SelectTrigger id="ed-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-route" className="text-sm font-medium">
                Route
              </label>
              <Select
                name="route"
                defaultValue={dose.route ?? ""}
                items={{ "": "— Select —", ...ROUTE_LABELS }}
              >
                <SelectTrigger id="ed-route">
                  <SelectValue placeholder="— Select —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Select —</SelectItem>
                  {ROUTES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROUTE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-when" className="text-sm font-medium">
                When
              </label>
              <Input
                id="ed-when"
                name="takenAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(dose.takenAt)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ed-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="ed-notes"
                name="notes"
                defaultValue={dose.notes ?? ""}
                maxLength={280}
              />
            </div>

            <DoseFormFields
              weightUnit={user.weightUnit}
              defaults={{
                site: dose.site,
                mood: dose.mood,
                energy: dose.energy,
                sideEffects,
                weight: doseWeight,
              }}
            />

            <div className="sm:col-span-2">
              <SubmitButton>
                <Save className="size-4" />
                Save changes
              </SubmitButton>
            </div>
          </ActionForm>

          <p className="text-muted-foreground mt-4 text-xs">
            Editing a dose updates its recorded details only — it doesn&apos;t
            re-adjust vial inventory.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
