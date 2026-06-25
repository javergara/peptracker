import { Syringe } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { DoseRowActions } from "@/components/log/dose-row-actions";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logDose } from "@/lib/actions/doses";
import {
  getLoggableCycles,
  getRecentDoseLogs,
  listPeptides,
  listActiveVials,
  getCurrentUser,
} from "@/lib/queries";
import { formatDate } from "@/lib/dates";
import { ROUTES, ROUTE_LABELS } from "@/types/peptide";
import { suggestNextSite } from "@/lib/sites";

export const metadata = { title: "Log Dose" };
export const dynamic = "force-dynamic";

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function LogPage() {
  const [peptides, cycles, recent, activeVials, user] = await Promise.all([
    listPeptides(),
    getLoggableCycles(),
    getRecentDoseLogs(15),
    listActiveVials(),
    getCurrentUser(),
  ]);

  const lastSite = recent.find((d) => d.site)?.site ?? null;
  const suggestedSite = suggestNextSite(lastSite);

  // Shape vials for DoseFormFields (include peptide name)
  const vialsForForm = activeVials.map((v) => ({
    id: v.id,
    label: v.label,
    remainingMcg: v.remainingMcg,
    peptide: v.peptide ? { name: v.peptide.name } : null,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Log a dose"
        description="Record an administration. Track injection sites to rotate them."
        accentColor={user.color ?? undefined}
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <form action={logDose} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Peptide <span className="text-destructive">*</span>
              </label>
              <select name="peptideId" required className={inputCls}>
                {peptides.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cycle (optional)</label>
              <select name="cycleId" defaultValue="" className={inputCls}>
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
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <select name="unit" defaultValue="mcg" className={inputCls}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Route</label>
              <select name="route" defaultValue="" className={inputCls}>
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
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <input name="notes" className={inputCls} />
            </div>

            {/* Enriched optional fields */}
            <DoseFormFields
              vials={vialsForForm}
              suggestedSite={suggestedSite}
              lastSite={lastSite}
            />

            <div className="sm:col-span-2">
              <Button type="submit">
                <Syringe className="size-4" />
                Log dose
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent doses</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Syringe className="size-6" />}
              title="No doses logged yet"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peptide</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((d) => (
                  <TableRow
                    key={d.id}
                    style={
                      user.color
                        ? { borderLeft: `3px solid ${user.color}` }
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {d.peptide.name}
                    </TableCell>
                    <TableCell>
                      {d.amount} {d.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(d.takenAt, "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.site ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DoseRowActions id={d.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
