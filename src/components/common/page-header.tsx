import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  accentColor,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Optional profile color — renders a vertical accent bar before the title. */
  accentColor?: string | null;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-stretch gap-3">
        {accentColor ? (
          <span
            aria-hidden
            className="w-1 shrink-0 rounded-full"
            style={{ background: accentColor }}
          />
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
