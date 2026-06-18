import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {icon ? (
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
          {hint ? (
            <p className="text-muted-foreground truncate text-xs">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
