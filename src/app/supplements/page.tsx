import { Pill, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/disclaimer";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { SupplementRow } from "@/components/supplements/supplement-row";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addSupplement } from "@/lib/actions/supplements";
import { listSupplements, getCurrentUser } from "@/lib/queries";
import { toDateInputValue } from "@/lib/dates";

export const metadata = { title: "Supplements" };
export const dynamic = "force-dynamic";

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
      <div className="card-surface mb-8 rounded-2xl">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">New supplement</Eyebrow>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Plus className="size-4" />
            Add supplement
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Track continuous supplements as date ranges alongside your
            protocols.
          </p>
        </div>
        <div className="px-5 py-4">
          <ActionForm
            action={addSupplement}
            success="Supplement added"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label htmlFor="supp-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="supp-name"
                name="name"
                required
                placeholder="e.g. Creatine, Vitamin D"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-category" className="text-sm font-medium">
                Category
              </label>
              <Select name="category" defaultValue="">
                <SelectTrigger id="supp-category">
                  <SelectValue placeholder="— None —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  <SelectItem value="vitamin">Vitamin</SelectItem>
                  <SelectItem value="mineral">Mineral</SelectItem>
                  <SelectItem value="omega">Omega</SelectItem>
                  <SelectItem value="amino">Amino Acid</SelectItem>
                  <SelectItem value="herbal">Herbal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-dose" className="text-sm font-medium">
                Dose
              </label>
              <Input
                id="supp-dose"
                name="dose"
                placeholder="e.g. 5 g"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-frequency" className="text-sm font-medium">
                Frequency
              </label>
              <Input
                id="supp-frequency"
                name="frequency"
                placeholder="e.g. daily"
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-start" className="text-sm font-medium">
                Start date
              </label>
              <Input
                id="supp-start"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(new Date())}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-end" className="text-sm font-medium">
                End date{" "}
                <span className="text-muted-foreground font-normal">
                  — optional
                </span>
              </label>
              <Input id="supp-end" name="endDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="supp-status" className="text-sm font-medium">
                Status
              </label>
              <Select name="status" defaultValue="active">
                <SelectTrigger id="supp-status">
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
              <label htmlFor="supp-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="supp-notes"
                name="notes"
                placeholder="optional"
                maxLength={280}
              />
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <SubmitButton>
                <Pill className="size-4" />
                Add supplement
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </div>

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
            <section aria-labelledby="active-supps-heading">
              <div className="mb-3 flex items-center gap-2">
                <Eyebrow id="active-supps-heading">
                  Active &mdash; <span className="num">{active.length}</span>
                </Eyebrow>
              </div>
              <div className="card-surface divide-border divide-y rounded-2xl">
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
            <section aria-labelledby="inactive-supps-heading">
              <div className="mb-3 flex items-center gap-2">
                <Eyebrow id="inactive-supps-heading">
                  Paused &amp; Stopped &mdash;{" "}
                  <span className="num">{inactive.length}</span>
                </Eyebrow>
              </div>
              <div className="card-surface divide-border divide-y rounded-2xl">
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
