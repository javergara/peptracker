import { Pill, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplementRow } from "@/components/supplements/supplement-row";
import { addSupplement } from "@/lib/actions/supplements";
import { listSupplements, getCurrentUser } from "@/lib/queries";
import { toDateInputValue } from "@/lib/dates";

export const metadata = { title: "Supplements" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function SupplementsPage() {
  const [supplements, user] = await Promise.all([
    listSupplements(),
    getCurrentUser(),
  ]);

  const accentColor = user.color ?? undefined;

  const active = supplements.filter((s) => s.status === "active");
  const inactive = supplements.filter(
    (s) => s.status === "paused" || s.status === "stopped",
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Supplements"
        description="Track continuous supplements alongside your protocols."
        accentColor={accentColor}
      />

      <Disclaimer className="mb-6" />

      {/* Add supplement form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Add supplement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm
            action={addSupplement}
            success="Supplement added"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label htmlFor="supp-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="supp-name"
                name="name"
                required
                placeholder="e.g. Creatine, Vitamin D"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="supp-category"
                name="category"
                defaultValue=""
                className={inputCls}
              >
                <option value="">— None —</option>
                <option value="vitamin">Vitamin</option>
                <option value="mineral">Mineral</option>
                <option value="omega">Omega</option>
                <option value="amino">Amino Acid</option>
                <option value="herbal">Herbal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-dose" className="text-sm font-medium">
                Dose
              </label>
              <input
                id="supp-dose"
                name="dose"
                placeholder="e.g. 5 g"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-frequency" className="text-sm font-medium">
                Frequency
              </label>
              <input
                id="supp-frequency"
                name="frequency"
                placeholder="e.g. daily"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-start" className="text-sm font-medium">
                Start date
              </label>
              <input
                id="supp-start"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(new Date())}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-end" className="text-sm font-medium">
                End date{" "}
                <span className="text-muted-foreground font-normal">
                  — optional
                </span>
              </label>
              <input
                id="supp-end"
                name="endDate"
                type="date"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="supp-status"
                name="status"
                defaultValue="active"
                className={inputCls}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="supp-notes" className="text-sm font-medium">
                Notes
              </label>
              <input
                id="supp-notes"
                name="notes"
                placeholder="optional"
                className={inputCls}
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <SubmitButton>
                <Pill className="size-4" />
                Add supplement
              </SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* Supplement list */}
      {supplements.length === 0 ? (
        <EmptyState
          icon={<Pill className="size-6" />}
          title="No supplements tracked yet"
          description="Add your first supplement above to start logging continuous compounds alongside your peptide protocols."
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">
                Active ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((s) => (
                  <SupplementRow
                    key={s.id}
                    supplement={s}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-3 text-base font-semibold">
                Paused & Stopped ({inactive.length})
              </h2>
              <div className="space-y-2">
                {inactive.map((s) => (
                  <SupplementRow
                    key={s.id}
                    supplement={s}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
