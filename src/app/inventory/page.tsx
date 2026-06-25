import { Package, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createVial } from "@/lib/actions/vials";
import { listVials, listPeptides, getCurrentUser } from "@/lib/queries";
import {
  vialConcentration,
  vialExpiryStatus,
  type ExpiryStatus,
} from "@/lib/vials";
import { DeleteVialButton } from "@/components/inventory/delete-vial-button";
import { ReconstituteForm } from "@/components/inventory/reconstitute-form";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

function ExpiryBadge({
  status,
  expiresAt,
}: {
  status: ExpiryStatus;
  expiresAt: Date | null;
}) {
  if (status === "none" || !expiresAt) return null;

  const label = expiresAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (status === "expired") {
    return (
      <Badge variant="destructive" className="text-xs">
        Expired {label}
      </Badge>
    );
  }
  if (status === "soon") {
    return (
      <Badge
        variant="outline"
        className="border-amber-400 text-xs text-amber-700 dark:text-amber-400"
      >
        Expires {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-xs">
      Expires {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="text-xs capitalize">
        Active
      </Badge>
    );
  }
  if (status === "sealed") {
    return (
      <Badge variant="secondary" className="text-xs capitalize">
        Sealed
      </Badge>
    );
  }
  if (status === "empty") {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground text-xs capitalize"
      >
        Empty
      </Badge>
    );
  }
  // expired
  return (
    <Badge variant="destructive" className="text-xs capitalize">
      Expired
    </Badge>
  );
}

export default async function InventoryPage() {
  const [vials, peptides, user] = await Promise.all([
    listVials(),
    listPeptides(),
    getCurrentUser(),
  ]);

  const activeVials = vials.filter(
    (v) => v.status === "active" || v.status === "sealed",
  );
  const inactiveVials = vials.filter(
    (v) => v.status === "empty" || v.status === "expired",
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Vial Inventory"
        description="Track your peptide vials, reconstitution status, and remaining doses."
        accentColor={user.color ?? undefined}
      />

      {/* Add Vial form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Add a Vial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createVial}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Peptide <span className="text-destructive">*</span>
              </label>
              <select name="peptideId" required className={inputCls}>
                <option value="">— Select peptide —</option>
                {peptides.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Label / lot</label>
              <input
                name="label"
                placeholder="e.g. Lot A, Vial 1"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Total amount (mcg) <span className="text-destructive">*</span>
              </label>
              <input
                name="totalMcg"
                type="number"
                step="any"
                min="1"
                required
                placeholder="e.g. 5000"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                BAC water (mL){" "}
                <span className="text-muted-foreground font-normal">
                  — fill to reconstitute now
                </span>
              </label>
              <input
                name="bacWaterMl"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 2 (optional)"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <input
                name="notes"
                placeholder="Optional notes"
                className={inputCls}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">
                <Plus className="size-4" />
                Add vial
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active / sealed vials */}
      {vials.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No vials tracked yet"
          description="Add your first vial above to start tracking your inventory."
        />
      ) : (
        <div className="space-y-8">
          {activeVials.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">
                Active & Sealed ({activeVials.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeVials.map((vial) => {
                  const expiry = vialExpiryStatus(vial.expiresAt);
                  const concentration = vialConcentration(
                    vial.totalMcg,
                    vial.bacWaterMl,
                  );
                  const pct =
                    vial.totalMcg > 0
                      ? Math.round((vial.remainingMcg / vial.totalMcg) * 100)
                      : 0;

                  return (
                    <Card key={vial.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <CardTitle className="truncate">
                              {vial.peptide.name}
                              {vial.label ? (
                                <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                                  — {vial.label}
                                </span>
                              ) : null}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <StatusBadge status={vial.status} />
                              <ExpiryBadge
                                status={expiry}
                                expiresAt={vial.expiresAt}
                              />
                            </div>
                          </div>
                          <DeleteVialButton id={vial.id} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {concentration != null && (
                          <p className="text-muted-foreground text-xs">
                            Concentration:{" "}
                            <span className="num text-foreground font-medium">
                              {concentration.toFixed(1)} mcg/mL
                            </span>
                          </p>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Remaining
                            </span>
                            <span className="num font-medium">
                              {vial.remainingMcg.toFixed(0)} /{" "}
                              {vial.totalMcg.toFixed(0)} mcg
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                        {vial.status === "sealed" && (
                          <div className="pt-1">
                            <ReconstituteForm id={vial.id} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {inactiveVials.length > 0 && (
            <section>
              <h2 className="text-muted-foreground mb-3 text-base font-semibold">
                Empty & Expired ({inactiveVials.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {inactiveVials.map((vial) => {
                  const expiry = vialExpiryStatus(vial.expiresAt);
                  const pct =
                    vial.totalMcg > 0
                      ? Math.round((vial.remainingMcg / vial.totalMcg) * 100)
                      : 0;

                  return (
                    <Card key={vial.id} className="opacity-60">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <CardTitle className="truncate">
                              {vial.peptide.name}
                              {vial.label ? (
                                <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                                  — {vial.label}
                                </span>
                              ) : null}
                            </CardTitle>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <StatusBadge status={vial.status} />
                              <ExpiryBadge
                                status={expiry}
                                expiresAt={vial.expiresAt}
                              />
                            </div>
                          </div>
                          <DeleteVialButton id={vial.id} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Remaining
                            </span>
                            <span className="num font-medium">
                              {vial.remainingMcg.toFixed(0)} /{" "}
                              {vial.totalMcg.toFixed(0)} mcg
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
