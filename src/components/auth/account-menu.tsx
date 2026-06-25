"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export function AccountMenu({ email }: { email: string }) {
  return (
    <form
      action={logoutAction}
      className="flex items-center justify-between gap-2 px-1"
    >
      <span className="text-muted-foreground truncate text-xs" title={email}>
        {email}
      </span>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-muted-foreground gap-1.5"
      >
        <LogOut className="size-3.5" />
        Log out
      </Button>
    </form>
  );
}
