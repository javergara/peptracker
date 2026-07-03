import Link from "next/link";
import { Syringe } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { DoseRowActions } from "@/components/log/dose-row-actions";
import { DoseFormFields } from "@/components/log/dose-form-fields";
import { DoseLogFilters } from "@/components/log/dose-log-filters";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getDoseLogsPage,
  listPeptides,
  listActiveVials,
  getCurrentUser,
} from "@/lib/queries";
import { formatDate, toDateTimeLocalValue } from "@/lib/dates";
import { moodFace } from "@/lib/mood";
import { asStringArray, ROUTES, ROUTE_LABELS } from "@/types/peptide";
import { suggestNextSite } from "@/lib/sites";
import { cn } from "@/lib/utils";

export const metadata = { title: "Log Dose" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; peptide?: string }>;
}) {
  const { page: pageParam, peptide: peptideId } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [peptides, cycles, dosesPage, recentForSite, activeVials, user] =
    await Promise.all([
      listPeptides(),
      getLoggableCycles(),
      getDoseLogsPage({ page, pageSize: PAGE_SIZE, peptideId }),
      // Site-rotation suggestion should reflect the true most-recent dose,
      // independent of the peptide filter / page above.
      getRecentDoseLogs(5),
      listActiveVials(),
      getCurrentUser(),
    ]);
  const { rows: recent, total } = dosesPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const lastSite = recentForSite.find((d) => d.site)?.site ?? null;
  const suggestedSite = suggestNextSite(lastSite);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (peptideId) params.set("peptide", peptideId);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/log?${qs}` : "/log";
  }

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
          <ActionForm
            action={logDose}
            success="Dose logged"
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <label htmlFor="l-peptide" className="text-sm font-medium">
                Peptide <span className="text-destructive">*</span>
              </label>
              <SearchableSelect
                id="l-peptide"
                name="peptideId"
                required
                placeholder="— Select peptide —"
                options={peptides.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-cycle" className="text-sm font-medium">
                Cycle (optional)
              </label>
              <Select name="cycleId" defaultValue="">
                <SelectTrigger id="l-cycle">
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
              <label htmlFor="l-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                id="l-amount"
                name="amount"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-unit" className="text-sm font-medium">
                Unit
              </label>
              <Select name="unit" defaultValue="mcg">
                <SelectTrigger id="l-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcg">mcg</SelectItem>
                  <SelectItem value="mg">mg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-route" className="text-sm font-medium">
                Route
              </label>
              <Select name="route" defaultValue="">
                <SelectTrigger id="l-route">
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
              <label htmlFor="l-when" className="text-sm font-medium">
                When
              </label>
              <Input
                id="l-when"
                name="takenAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(new Date())}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="l-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input id="l-notes" name="notes" maxLength={280} />
            </div>

            {/* Enriched optional fields */}
            <DoseFormFields
              vials={vialsForForm}
              suggestedSite={suggestedSite}
              lastSite={lastSite}
              weightUnit={user.weightUnit}
            />

            <div className="sm:col-span-2">
              <SubmitButton>
                <Syringe className="size-4" />
                Log dose
              </SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Recent doses</CardTitle>
          {peptides.length > 0 ? (
            <DoseLogFilters peptides={peptides} selectedPeptideId={peptideId} />
          ) : null}
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Syringe className="size-6" />}
              title={
                peptideId || page > 1
                  ? "No doses match this filter"
                  : "No doses logged yet"
              }
              action={
                peptideId || page > 1 ? (
                  <Link
                    href="/log"
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Clear filter
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peptide</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((d) => {
                  const mood = moodFace(d.mood);
                  const sideEffects = asStringArray(d.sideEffects);
                  return (
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
                        {d.notes || sideEffects.length > 0 ? (
                          <p
                            className="text-muted-foreground max-w-[220px] truncate text-xs font-normal"
                            title={[sideEffects.join(", "), d.notes]
                              .filter(Boolean)
                              .join(" — ")}
                          >
                            {sideEffects.length > 0
                              ? `SE: ${sideEffects.join(", ")}`
                              : ""}
                            {sideEffects.length > 0 && d.notes ? " — " : ""}
                            {d.notes ?? ""}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="num">
                        {d.amount} {d.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(d.takenAt, "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.site ?? "—"}
                      </TableCell>
                      <TableCell>
                        {mood ? (
                          <span
                            role="img"
                            aria-label={mood.label}
                            title={mood.label}
                          >
                            {mood.emoji}
                          </span>
                        ) : null}
                        {d.energy != null ? (
                          <span
                            className="num text-muted-foreground ml-1 text-xs"
                            title={`Energy: ${d.energy}/5`}
                          >
                            ⚡{d.energy}
                          </span>
                        ) : null}
                        {!mood && d.energy == null ? (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <DoseRowActions id={d.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-muted-foreground num text-sm">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                  className={cn(
                    "hover:bg-accent rounded-lg border px-2.5 py-1.5 text-sm",
                    page <= 1 && "pointer-events-none opacity-40",
                  )}
                >
                  Prev
                </Link>
                <Link
                  href={pageHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  tabIndex={page >= totalPages ? -1 : undefined}
                  className={cn(
                    "hover:bg-accent rounded-lg border px-2.5 py-1.5 text-sm",
                    page >= totalPages && "pointer-events-none opacity-40",
                  )}
                >
                  Next
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
