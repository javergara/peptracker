import { Clock, Package, Plus, RefreshCw, X } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { VialGauge } from "@/components/common/vial-gauge";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { createVial } from "@/lib/actions/vials";
import { listVials, listPeptides, getCurrentUser } from "@/lib/queries";
import {
  vialConcentration,
  vialFillPercent,
  vialGaugeStatus,
} from "@/lib/vials";
import { VIAL_STATUS_STYLE } from "@/lib/constants";
import { DeleteVialButton } from "@/components/inventory/delete-vial-button";
import { ReconstituteForm } from "@/components/inventory/reconstitute-form";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function InventoryPage() {
  const [vials, peptides, user] = await Promise.all([
    listVials(),
    listPeptides(),
    getCurrentUser(),
  ]);

  // Summary strip computations
  const activeAndSealed = vials.filter(
    (v) => v.status === "active" || v.status === "sealed",
  );
  const totalOnHand = activeAndSealed.reduce(
    (sum, v) => sum + v.remainingMcg,
    0,
  );

  // Next expiry: soonest future expiresAt among active vials
  const now = new Date();
  const nextExpiryVial = vials
    .filter(
      (v) =>
        v.status === "active" &&
        v.expiresAt &&
        differenceInCalendarDays(v.expiresAt, now) >= 0,
    )
    .sort((a, b) => {
      if (!a.expiresAt || !b.expiresAt) return 0;
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    })[0];

  const nextExpiryDays = nextExpiryVial?.expiresAt
    ? differenceInCalendarDays(nextExpiryVial.expiresAt, now)
    : null;

  // Sort: active/sealed first, then empty/expired de-emphasized
  const primaryVials = vials.filter(
    (v) => v.status === "active" || v.status === "sealed",
  );
  const secondaryVials = vials.filter(
    (v) => v.status === "empty" || v.status === "expired",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Inventory"
        description="Reconstituted vials, concentration &amp; shelf life."
        accentColor={user.color ?? undefined}
        actions={
          <a
            href="#add-vial"
            className="flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-sm font-semibold text-white no-underline [box-shadow:0_10px_22px_-10px_rgba(124,58,237,.85)] [background:linear-gradient(180deg,#8B47F0,#7C3AED)]"
          >
            <Plus className="size-3.5" />
            Add vial
          </a>
        }
      />

      {/* Ink summary strip */}
      <InkPanel variant="strip" className="p-[18px_24px]">
        <div className="flex divide-x divide-white/10">
          <div className="flex-1 pr-6">
            <Eyebrow className="text-[#8E88B4]">Active Vials</Eyebrow>
            <div className="num mt-1 text-[28px] font-semibold text-[#EFEBFA]">
              {activeAndSealed.length}
            </div>
          </div>
          <div className="flex-[1.2] px-6">
            <Eyebrow className="text-[#8E88B4]">Peptide on Hand</Eyebrow>
            <div className="num mt-1 text-[28px] font-semibold text-[#EFEBFA]">
              {totalOnHand.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
              <span className="ml-1 text-sm font-normal text-[#A8A2CC]">
                mcg
              </span>
            </div>
          </div>
          <div className="flex-[1.4] pl-6">
            <Eyebrow className="text-[#8E88B4]">Next Expiry</Eyebrow>
            <div className="mt-1 flex items-baseline gap-2">
              {nextExpiryDays !== null ? (
                <>
                  <span className="num text-[28px] font-semibold text-[#F59E0B]">
                    {nextExpiryDays === 0
                      ? "Today"
                      : nextExpiryDays === 1
                        ? "1 day"
                        : `${nextExpiryDays} days`}
                  </span>
                  <span className="text-sm text-[#A8A2CC]">
                    {nextExpiryVial?.peptide.name}
                  </span>
                </>
              ) : (
                <span className="num text-[28px] font-semibold text-[#EFEBFA]">
                  —
                </span>
              )}
            </div>
          </div>
        </div>
      </InkPanel>

      {/* Vial grid */}
      {vials.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No vials tracked yet"
          description="Add your first vial below to start tracking your inventory."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...primaryVials, ...secondaryVials].map((vial) => {
            const gaugeStatus = vialGaugeStatus(vial);
            const fillPct = vialFillPercent(vial.remainingMcg, vial.totalMcg);
            const concentration = vialConcentration(
              vial.totalMcg,
              vial.bacWaterMl,
            );
            const statusStyle = VIAL_STATUS_STYLE[gaugeStatus];
            const isInactive =
              vial.status === "empty" || vial.status === "expired";

            // Expiry date label
            const expiryLabel = vial.expiresAt
              ? vial.expiresAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : null;

            return (
              <div
                key={vial.id}
                className={cn(
                  "card-surface flex gap-4 rounded-[18px] p-[18px] transition-shadow hover:[box-shadow:var(--shadow-card-hover)]",
                  gaugeStatus === "soon" && "border-warn/40",
                  gaugeStatus === "expired" && "border-bad/30",
                  isInactive && "opacity-70",
                )}
              >
                {/* Vial gauge */}
                <div className="shrink-0">
                  <VialGauge fillPercent={fillPct} status={gaugeStatus} />
                </div>

                {/* Info column */}
                <div className="min-w-0 flex-1">
                  {/* Name row + delete button */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-display text-foreground truncate text-[15px] font-semibold">
                        {vial.peptide.name}
                        {vial.label ? (
                          <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                            — {vial.label}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "num rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          statusStyle.pill,
                        )}
                      >
                        {gaugeStatus === "soon" && nextExpiryDays !== null
                          ? `${nextExpiryDays}d left`
                          : statusStyle.label}
                      </span>
                      <DeleteVialButton id={vial.id} />
                    </div>
                  </div>

                  {/* Concentration */}
                  <p className="num mt-0.5 text-[11.5px] text-[#8B86AD]">
                    {concentration != null
                      ? `${concentration >= 1000 ? (concentration / 1000).toFixed(1) + " mg/mL" : concentration.toFixed(0) + " mcg/mL"}`
                      : "Not reconstituted"}
                  </p>

                  {/* Remaining amount — big mono */}
                  <div className="mt-3">
                    <div
                      className={cn(
                        "num text-[22px] font-semibold",
                        gaugeStatus === "expired"
                          ? "text-muted-foreground line-through"
                          : gaugeStatus === "empty"
                            ? "text-muted-foreground"
                            : "text-foreground",
                      )}
                    >
                      {vial.remainingMcg.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                      <span className="ml-0.5 text-xs font-normal text-[#8B86AD]">
                        {" "}
                        mcg
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {gaugeStatus === "expired"
                        ? "Past 28-day window"
                        : gaugeStatus === "empty"
                          ? "Depleted"
                          : gaugeStatus === "sealed"
                            ? "Full vial · in reserve"
                            : `${fillPct}% remaining`}
                    </p>
                  </div>

                  {/* Expiry / action line */}
                  <div className="mt-2.5">
                    {gaugeStatus === "sealed" ? (
                      <ReconstituteForm id={vial.id} />
                    ) : gaugeStatus === "expired" ? (
                      <p className="text-bad flex items-center gap-1.5 text-[11.5px] font-medium">
                        <X className="size-3" />
                        Discard &amp; archive
                      </p>
                    ) : gaugeStatus === "empty" ? (
                      <p className="text-primary flex items-center gap-1.5 text-[11.5px] font-medium">
                        <RefreshCw className="size-3" />
                        Reorder
                      </p>
                    ) : expiryLabel ? (
                      <p
                        className={cn(
                          "flex items-center gap-1.5 text-[11.5px]",
                          gaugeStatus === "soon"
                            ? "text-warn-foreground font-medium"
                            : "text-[#8B86AD]",
                        )}
                      >
                        <Clock className="size-3 shrink-0" />
                        Expires {expiryLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add a Vial form */}
      <section id="add-vial" className="card-surface rounded-[18px] p-6">
        <Eyebrow className="mb-4">Add a Vial</Eyebrow>
        <ActionForm
          action={createVial}
          success="Vial added"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-1.5">
            <label htmlFor="v-peptide" className="text-sm font-medium">
              Peptide <span className="text-destructive">*</span>
            </label>
            <select
              id="v-peptide"
              name="peptideId"
              required
              className={inputCls}
            >
              <option value="">— Select peptide —</option>
              {peptides.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-label" className="text-sm font-medium">
              Label / lot
            </label>
            <input
              id="v-label"
              name="label"
              placeholder="e.g. Lot A, Vial 1"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-total" className="text-sm font-medium">
              Total amount (mcg) <span className="text-destructive">*</span>
            </label>
            <input
              id="v-total"
              name="totalMcg"
              type="number"
              step="any"
              min="1"
              inputMode="decimal"
              required
              placeholder="e.g. 5000"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-bac" className="text-sm font-medium">
              BAC water (mL){" "}
              <span className="text-muted-foreground font-normal">
                — fill to reconstitute now
              </span>
            </label>
            <input
              id="v-bac"
              name="bacWaterMl"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              placeholder="e.g. 2 (optional)"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-notes" className="text-sm font-medium">
              Notes
            </label>
            <input
              id="v-notes"
              name="notes"
              placeholder="Optional notes"
              className={inputCls}
            />
          </div>
          <div className="flex items-end">
            <SubmitButton>
              <Plus className="size-4" />
              Add vial
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
