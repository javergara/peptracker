import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading-skeleton primitives shared by route `loading.tsx` files so
 * navigations show structure instead of a blank frozen page. Surfaces mirror
 * the real "Clinical Instrument" card shape (`card-surface rounded-[18px]`,
 * NOT the shadcn `Card`) so there's no shape-shift once data arrives.
 */

/** A single card-surface-shaped skeleton block (title + a few lines). */
export function SkeletonCard({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("card-surface space-y-3 rounded-[18px] p-5", className)}>
      <Skeleton className="h-5 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Dark Ink-panel-shaped skeleton — for hero metric blocks (cycle progress). */
export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] p-6 [background:var(--gradient-ink-panel)]",
        className,
      )}
    >
      <Skeleton className="h-2.5 w-28 bg-white/10" />
      <Skeleton className="mt-4 h-11 w-44 bg-white/10" />
      <Skeleton className="mt-5 h-2 w-full rounded-full bg-white/10" />
    </div>
  );
}

/** Label + input skeleton pairs, matching the `<label>` + input form pattern. */
export function SkeletonFormFields({
  fields = 6,
  columns = 2,
}: {
  fields?: number;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** A stack of row-shaped skeletons — table rows / list rows. */
export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

/** Header skeleton matching `PageHeader` (title + description). */
export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/**
 * Generic page loading skeleton used by route `loading.tsx` files.
 *
 * - `variant="list"` (default): header + a card-surface grid, optional rows.
 * - `variant="form"`: header + one card-surface form-fields card, optional
 *   rows below (e.g. a recent-items table under a log form).
 */
export function PageSkeleton({
  variant = "list",
  cards = 3,
  columns = 3,
  rows = 0,
  fields = 6,
  maxWidth = "max-w-5xl",
}: {
  variant?: "list" | "form";
  cards?: number;
  columns?: 1 | 2 | 3 | 4;
  rows?: number;
  fields?: number;
  maxWidth?: string;
}) {
  const colClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : columns === 1
          ? ""
          : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`mx-auto ${maxWidth}`}>
      <SkeletonHeader />

      {variant === "form" ? (
        <div className="card-surface mb-6 rounded-[18px] p-6">
          <SkeletonFormFields fields={fields} />
          <Skeleton className="mt-4 h-9 w-32" />
        </div>
      ) : cards > 0 ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}

      {rows > 0 ? (
        <div
          className={
            variant === "form" ? "card-surface rounded-[18px] p-6" : "mt-6"
          }
        >
          {variant === "form" ? <Skeleton className="mb-4 h-5 w-32" /> : null}
          <SkeletonRows rows={rows} />
        </div>
      ) : null}
    </div>
  );
}
