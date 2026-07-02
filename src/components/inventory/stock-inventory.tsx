import { Boxes, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { InkPanel } from "@/components/common/ink-panel";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { ActivateStockForm } from "@/components/inventory/activate-stock-form";
import { StockQuantityControls } from "@/components/inventory/stock-quantity-controls";
import { addStock } from "@/lib/actions/stock";
import type { StockLevel } from "@/lib/queries";
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  estimateStockSupply,
  isLowStock,
  toMcg,
} from "@/lib/stock";
import { cn } from "@/lib/utils";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

interface StockItemView {
  id: string;
  peptideId: string;
  vialMcg: number;
  quantity: number;
  dose: number | null;
  doseUnit: string;
  frequency: string;
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
            <Eyebrow className="text-[#8E88B4]">Reserve Vials</Eyebrow>
            <div className="num mt-1 text-[28px] font-semibold text-[#EFEBFA]">
              {totalReserve}
            </div>
          </div>
          <div className="flex-1 px-6">
            <Eyebrow className="text-[#8E88B4]">Running Low</Eyebrow>
            <div
              className={cn(
                "num mt-1 text-[28px] font-semibold",
                lowCount > 0 ? "text-[#F59E0B]" : "text-[#EFEBFA]",
              )}
            >
              {lowCount}
            </div>
          </div>
          <div className="flex-[1.3] pl-6">
            <Eyebrow className="text-[#8E88B4]">Next To Run Out</Eyebrow>
            <div className="num mt-1 text-[28px] font-semibold text-[#EFEBFA]">
              {soonestDays != null ? (
                <>
                  {soonestDays}
                  <span className="ml-1 text-sm font-normal text-[#A8A2CC]">
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

            return (
              <div
                key={item.id}
                className={cn(
                  "card-surface flex flex-col gap-3 rounded-[18px] p-[18px] transition-shadow hover:[box-shadow:var(--shadow-card-hover)]",
                  low && "border-warn/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-foreground truncate text-[15px] font-semibold">
                      {item.peptide.name}
                    </p>
                    <p className="num text-[11.5px] text-[#8B86AD]">
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
                    <span className="ml-1 text-xs font-normal text-[#8B86AD]">
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
                </div>

                <div className="mt-auto space-y-2 border-t border-[#F1EEF9] pt-3">
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
            <select
              id="s-peptide"
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
            <label htmlFor="s-vialmg" className="text-sm font-medium">
              Vial size (mg) <span className="text-destructive">*</span>
            </label>
            <input
              id="s-vialmg"
              name="vialMg"
              type="number"
              step="any"
              min="0.1"
              inputMode="decimal"
              required
              placeholder="e.g. 5"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-qty" className="text-sm font-medium">
              Quantity <span className="text-destructive">*</span>
            </label>
            <input
              id="s-qty"
              name="quantity"
              type="number"
              step="1"
              min="1"
              defaultValue={1}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-dose" className="text-sm font-medium">
              Planned dose
            </label>
            <div className="flex gap-2">
              <input
                id="s-dose"
                name="dose"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder="e.g. 250"
                className={inputCls}
              />
              <select
                name="doseUnit"
                defaultValue="mcg"
                aria-label="Dose unit"
                className={inputCls}
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-freq" className="text-sm font-medium">
              Frequency
            </label>
            <select
              id="s-freq"
              name="frequency"
              defaultValue="daily"
              className={inputCls}
            >
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="s-notes" className="text-sm font-medium">
              Notes
            </label>
            <input
              id="s-notes"
              name="notes"
              placeholder="Optional notes"
              className={inputCls}
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
