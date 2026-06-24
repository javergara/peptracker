"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { setActiveUser } from "@/lib/actions/profiles";
import { cn } from "@/lib/utils";

export interface ProfileOption {
  id: string;
  name: string;
  color: string | null;
}

function Dot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: color ?? "var(--muted-foreground)" }}
    />
  );
}

export function ProfileMenu({
  users,
  activeId,
}: {
  users: ProfileOption[];
  activeId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();
  const active = users.find((u) => u.id === activeId) ?? users[0];

  function switchTo(id: string) {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await setActiveUser(id);
        toast.success("Switched profile");
      } catch {
        toast.error("Could not switch profile.");
      }
      setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="border-border bg-background hover:bg-accent flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors"
      >
        <Dot color={active?.color ?? null} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">
          {active?.name ?? "Profile"}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="bg-popover absolute z-40 mt-1 w-full overflow-hidden rounded-lg border shadow-md">
            <div className="text-muted-foreground px-2.5 py-1.5 text-xs font-medium">
              Profiles
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => switchTo(u.id)}
                    className="hover:bg-accent flex w-full items-center gap-2 px-2.5 py-2 text-sm"
                  >
                    <Dot color={u.color} />
                    <span className="flex-1 truncate text-left">{u.name}</span>
                    {u.id === activeId ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={cn(
                  "hover:bg-accent flex items-center gap-2 px-2.5 py-2 text-sm",
                )}
              >
                <Settings2 className="size-4" />
                Manage profiles
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
