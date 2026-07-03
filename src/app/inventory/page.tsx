import Link from "next/link";
import { Clock, Package, Plus, RefreshCw, X } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { VialGauge } from "@/components/common/vial-gauge";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { StockInventory } from "@/components/inventory/stock-inventory";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
import { createVial } from "@/lib/actions/vials";
import {
  listVials,
  listPeptides,
  getCurrentUser,
  listStockItems,
  getStockLevels,
} from "@/lib/queries";
import {
  vialConcentration,
  vialFillPercent,
  vialGaugeStatus,
} from "@/lib/vials";
import { costPerDose, formatCost } from "@/lib/cost";
import { toMcg } from "@/lib/stock";
import { asDosage } from "@/types/peptide";
import { VIAL_STATUS_STYLE } from "@/lib/constants";
import { DeleteVialButton } from "@/components/inventory/delete-vial-button";
import { ReconstituteForm } from "@/components/inventory/reconstitute-form";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

/**
 * Best-effort typical dose (in mcg) parsed from a peptide's dosage.standard
 * field (e.g. "250-500" mcg → 250, "1.2-2.4" mg → 1200). Used only to derive
 * a cost-per-dose estimate on active vials; returns null when unparseable.
 */
function typicalDoseMcg(dosage: unknown): number | null {
  const d = asDosage(dosage);
  if (!d) return null;
  const match = d.standard.match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return toMcg(n, d.unit);
}

type InventoryMode = "active" | "stock";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; peptide?: string }>;
}) {
  const { tab, peptide: peptideFilter } = await searchParams;
  const mode: InventoryMode = tab === "stock" ? "stock" : "active";

  const [peptides, user, vials, stockItems, levels] = await Promise.all([
    listPeptides(),
    getCurrentUser(),
    mode === "active" ? listVials() : Promise.resolve([]),
    mode === "stock" ? listStockItems() : Promise.resolve([]),
    mode === "stock" ? getStockLevels() : Promise.resolve([]),
  ]);

  // Peptide filter pills — derived from the peptides that actually have
  // vials on this tab (no extra query, `vials` is already fetched).
  const vialPeptides =
    mode === "active"
      ? Array.from(
          new Map(vials.map((v) => [v.peptideId, v.peptide.name])).entries(),
        )
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  const displayedVials =
    mode === "active" && peptideFilter
      ? vials.filter((v) => v.peptideId === peptideFilter)
      : vials;

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

  // Sort: active/sealed first, then empty/expired de-emphasized. Uses
  // `displayedVials` so the peptide filter narrows the grid only.
  const primaryVials = displayedVials.filter(
    (v) => v.status === "active" || v.status === "sealed",
  );
  const secondaryVials = displayedVials.filter(
    (v) => v.status === "empty" || v.status === "expired",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Inventory"
        description="Active vials in use &amp; your stored stock reserve."
        accentColor={user.color ?? undefined}
        actions={
          <a
            href={mode === "stock" ? "#add-stock" : "#add-vial"}
            className="btn-gradient flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-sm font-semibold text-white no-underline"
          >
            <Plus className="size-3.5" />
            {mode === "stock" ? "Add to stock" : "Add vial"}
          </a>
        }
      />

      {/* Mode tabs */}
      <div className="border-border flex gap-1 border-b">
        {(
          [
            { key: "active", label: "Active vials", href: "/inventory" },
            {
              key: "stock",
              label: "Stock reserve",
              href: "/inventory?tab=stock",
            },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              mode === t.key
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {mode === "stock" ? (
        <StockInventory
          stockItems={stockItems}
          levels={levels}
          peptides={peptides}
        />
      ) : (
        <>
          {/* Ink summary strip */}
          <InkPanel variant="strip" className="p-[18px_24px]">
            <div className="flex divide-x divide-white/10">
              <div className="flex-1 pr-6">
                <Eyebrow className="text-ink-caption">Active Vials</Eyebrow>
                <div className="num text-ink-foreground mt-1 text-[28px] font-semibold">
                  {activeAndSealed.length}
                </div>
              </div>
              <div className="flex-[1.2] px-6">
                <Eyebrow className="text-ink-caption">Peptide on Hand</Eyebrow>
                <div className="num text-ink-foreground mt-1 text-[28px] font-semibold">
                  {totalOnHand.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                  <span className="text-ink-muted ml-1 text-sm font-normal">
                    mcg
                  </span>
                </div>
              </div>
              <div className="flex-[1.4] pl-6">
                <Eyebrow className="text-ink-caption">Next Expiry</Eyebrow>
                <div className="mt-1 flex items-baseline gap-2">
                  {nextExpiryDays !== null ? (
                    <>
                      <span className="num text-warn text-[28px] font-semibold">
                        {nextExpiryDays === 0
                          ? "Today"
                          : nextExpiryDays === 1
                            ? "1 day"
                            : `${nextExpiryDays} days`}
                      </span>
                      <span className="text-ink-muted text-sm">
                        {nextExpiryVial?.peptide.name}
                      </span>
                    </>
                  ) : (
                    <span className="num text-ink-foreground text-[28px] font-semibold">
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
          </InkPanel>

          {/* Peptide filter pills */}
          {vialPeptides.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/inventory"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  !peptideFilter
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                All peptides
              </Link>
              {vialPeptides.map((p) => (
                <Link
                  key={p.id}
                  href={`/inventory?peptide=${p.id}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    peptideFilter === p.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Vial grid */}
          {vials.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="No vials tracked yet"
              description="Add your first vial below to start tracking your inventory."
            />
          ) : displayedVials.length === 0 ? (
            <EmptyState
              icon={<Package className="size-6" />}
              title="No vials for this peptide"
              action={
                <Link
                  href="/inventory"
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Clear filter
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...primaryVials, ...secondaryVials].map((vial) => {
                const gaugeStatus = vialGaugeStatus(vial);
                const fillPct = vialFillPercent(
                  vial.remainingMcg,
                  vial.totalMcg,
                );
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

                // Cost — per-dose when a typical dose is derivable, else total.
                const doseMcg = typicalDoseMcg(vial.peptide.dosage);
                const perDose = costPerDose(vial.price, vial.totalMcg, doseMcg);
                const costLabel =
                  vial.price == null
                    ? null
                    : perDose != null
                      ? `${formatCost(perDose)}/dose`
                      : `${formatCost(vial.price)} total`;

                return (
                  <div
                    key={vial.id}
                    className={cn(
                      "card-surface flex gap-4 rounded-[18px] p-[18px]",
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
                      <p className="num text-muted-foreground mt-0.5 text-[11.5px]">
                        {concentration != null
                          ? `${concentration >= 1000 ? (concentration / 1000).toFixed(1) + " mg/mL" : concentration.toFixed(0) + " mcg/mL"}`
                          : "Not reconstituted"}
                        {costLabel ? ` · ${costLabel}` : ""}
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
                          <span className="text-muted-foreground ml-0.5 text-xs font-normal">
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
                                : "text-muted-foreground",
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
                <SearchableSelect
                  id="v-peptide"
                  name="peptideId"
                  required
                  placeholder="— Select peptide —"
                  options={peptides.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="v-label" className="text-sm font-medium">
                  Label / lot
                </label>
                <Input
                  id="v-label"
                  name="label"
                  placeholder="e.g. Lot A, Vial 1"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="v-total" className="text-sm font-medium">
                  Total amount (mcg) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="v-total"
                  name="totalMcg"
                  type="number"
                  step="any"
                  min="1"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="v-bac" className="text-sm font-medium">
                  BAC water (mL){" "}
                  <span className="text-muted-foreground font-normal">
                    — fill to reconstitute now
                  </span>
                </label>
                <Input
                  id="v-bac"
                  name="bacWaterMl"
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  placeholder="e.g. 2 (optional)"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="v-price" className="text-sm font-medium">
                  Price (per vial){" "}
                  <span className="text-muted-foreground font-normal">
                    — optional
                  </span>
                </label>
                <Input
                  id="v-price"
                  name="price"
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="e.g. 45.00"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="v-notes" className="text-sm font-medium">
                  Notes
                </label>
                <Input
                  id="v-notes"
                  name="notes"
                  placeholder="Optional notes"
                  maxLength={280}
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
        </>
      )}
    </div>
  );
}
