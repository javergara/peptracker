import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page loading skeleton (header + card grid, optional table/rows) used by
 * route `loading.tsx` files so navigations show structure instead of a blank
 * frozen page.
 */
export function PageSkeleton({
  cards = 3,
  columns = 3,
  rows = 0,
  maxWidth = "max-w-5xl",
}: {
  cards?: number;
  columns?: 2 | 3 | 4;
  rows?: number;
  maxWidth?: string;
}) {
  const colClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`mx-auto ${maxWidth}`}>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      {cards > 0 ? (
        <div className={`grid gap-4 ${colClass}`}>
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {rows > 0 ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
