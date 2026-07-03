import { Boxes, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { ActivateStockForm } from "@/components/inventory/activate-stock-form";
import { StockQuantityControls } from "@/components/inventory/stock-quantity-controls";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStock } from "@/lib/actions/stock";
import type { StockLevel } from "@/lib/queries";
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  estimateStockSupply,
  isLowStock,
  toMcg,
} from "@/lib/stock";
import { costPerDose, costPerMonth, formatCost } from "@/lib/cost";
import { cn } from "@/lib/utils";

interface StockItemView {
  id: string;
  peptideId: string;
  vialMcg: number;
  quantity: number;
  dose: number | null;
  doseUnit: string;
  frequency: string;
  price: number | null;
  peptide: { name: string };
}

/** Format a vial size in mg (5000 mcg → "5 mg"). */
function vialMgLabel(vialMcg: number) {
  const mg = vialMcg / 1000;
  return `${Number.isInteger(mg) ? mg : mg.toFixed(1)} mg`;
}

export function StockInventory({
  stockItems,
  levels,
  peptides,
}: {
  stockItems: StockItemView[];
  levels: StockLevel[];
  peptides: { id: string; name: string }[];
}) {
  const levelByPeptide = new Map(levels.map((l) => [l.peptideId, l]));

  const totalReserve = stockItems.reduce((s, i) => s + i.quantity, 0);
  const lowCount = levels.filter((l) => isLowStock(l.total)).length;
  const soonestDays = stockItems
    .map(
      (i) =>
        estimateStockSupply({
          vialMcg: i.vialMcg,
          quantity: i.quantity,
          doseMcg: toMcg(i.dose, i.doseUnit),
          frequency: i.frequency,
        }).days,
    )
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b)[0];

  return (
    <div className="space-y-6">
      {/* Ink summary strip */}
      <InkPanel variant="strip" className="p-[18px_24px]">
        <div className="flex divide-x divide-white/10">
          <div className="flex-1 pr-6">
            <Eyebrow className="text-ink-caption">Reserve Vials</Eyebrow>
            <div className="num text-ink-foreground mt-1 text-[28px] font-semibold">
              {totalReserve}
            </div>
          </div>
          <div className="flex-1 px-6">
            <Eyebrow className="text-ink-caption">Running Low</Eyebrow>
            <div
              className={cn(
                "num mt-1 text-[28px] font-semibold",
                lowCount > 0 ? "text-warn" : "text-ink-foreground",
              )}
            >
              {lowCount}
            </div>
          </div>
          <div className="flex-[1.3] pl-6">
            <Eyebrow className="text-ink-caption">Next To Run Out</Eyebrow>
            <div className="num text-ink-foreground mt-1 text-[28px] font-semibold">
              {soonestDays != null ? (
                <>
                  {soonestDays}
                  <span className="text-ink-muted ml-1 text-sm font-normal">
                    days
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </InkPanel>

      {/* Stock grid */}
      {stockItems.length === 0 ? (
        <EmptyState
          icon={<Boxes className="size-6" />}
          title="No stock in reserve"
          description="Add unopened vials below to track what you have stored and estimate how long it lasts."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stockItems.map((item) => {
            const doseMcg = toMcg(item.dose, item.doseUnit);
            const supply = estimateStockSupply({
              vialMcg: item.vialMcg,
              quantity: item.quantity,
              doseMcg,
              frequency: item.frequency,
            });
            const level = levelByPeptide.get(item.peptideId);
            const low = level ? isLowStock(level.total) : item.quantity <= 1;
            const doseLabel =
              item.dose != null
                ? `${item.dose} ${item.doseUnit} · ${FREQUENCY_LABELS[item.frequency] ?? item.frequency}`
                : null;
            const perDoseCost = costPerDose(item.price, item.vialMcg, doseMcg);
            const perMonthCost = costPerMonth(perDoseCost, item.frequency);

            return (
              <div
                key={item.id}
                className={cn(
                  "card-surface flex flex-col gap-3 rounded-[18px] p-[18px]",
                  low && "border-warn/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-foreground truncate text-[15px] font-semibold">
                      {item.peptide.name}
                    </p>
                    <p className="num text-muted-foreground text-[11.5px]">
                      {vialMgLabel(item.vialMcg)} each
                    </p>
                  </div>
                  {low ? (
                    <span className="bg-warn-wash text-warn-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                      Low stock
                    </span>
                  ) : null}
                </div>

                {/* Quantity */}
                <div>
                  <div className="num text-foreground text-[22px] font-semibold">
                    ×{item.quantity}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      vials
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {doseLabel ? (
                      <>
                        {doseLabel}
                        {supply.days != null ? (
                          <span className="text-foreground font-medium">
                            {" "}
                            → ~{supply.days} days
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "Set a dose to estimate supply"
                    )}
                  </p>
                  {perDoseCost != null ? (
                    <p className="num text-muted-foreground mt-0.5 text-[11.5px]">
                      {formatCost(perDoseCost)}/dose
                      {perMonthCost != null
                        ? ` · ~${formatCost(perMonthCost)}/mo`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <div className="border-border mt-auto space-y-2 border-t pt-3">
                  <StockQuantityControls
                    id={item.id}
                    quantity={item.quantity}
                  />
                  <ActivateStockForm
                    stockId={item.id}
                    disabled={item.quantity <= 0}
                    doseLabel={doseLabel}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add to stock */}
      <section id="add-stock" className="card-surface rounded-[18px] p-6">
        <Eyebrow className="mb-4">Add to Stock</Eyebrow>
        <ActionForm
          action={addStock}
          success="Added to stock"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-1.5">
            <label htmlFor="s-peptide" className="text-sm font-medium">
              Peptide <span className="text-destructive">*</span>
            </label>
            <SearchableSelect
              id="s-peptide"
              name="peptideId"
              required
              placeholder="— Select peptide —"
              options={peptides.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-vialmg" className="text-sm font-medium">
              Vial size (mg) <span className="text-destructive">*</span>
            </label>
            <Input
              id="s-vialmg"
              name="vialMg"
              type="number"
              step="any"
              min="0.1"
              inputMode="decimal"
              required
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-qty" className="text-sm font-medium">
              Quantity <span className="text-destructive">*</span>
            </label>
            <Input
              id="s-qty"
              name="quantity"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              defaultValue={1}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-dose" className="text-sm font-medium">
              Planned dose
            </label>
            <div className="flex gap-2">
              <Input
                id="s-dose"
                name="dose"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 250"
              />
              <Select name="doseUnit" defaultValue="mcg">
                <SelectTrigger aria-label="Dose unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-freq" className="text-sm font-medium">
              Frequency
            </label>
            <Select name="frequency" defaultValue="daily">
              <SelectTrigger id="s-freq">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-price" className="text-sm font-medium">
              Price (per vial){" "}
              <span className="text-muted-foreground font-normal">
                — optional
              </span>
            </label>
            <Input
              id="s-price"
              name="price"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="e.g. 45.00"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="s-notes"
              name="notes"
              placeholder="Optional notes"
              maxLength={280}
            />
          </div>
          <div className="flex items-end">
            <SubmitButton>
              <Plus className="size-4" />
              Add to stock
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
