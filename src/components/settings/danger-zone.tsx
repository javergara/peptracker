"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteAccountAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Danger zone: permanently delete the account and all its data. Two-step guard —
 * the user must enter their password AND confirm the browser dialog. On success
 * the server action clears the session and redirects to /login, so no local
 * navigation is needed here.
 */
export function DangerZone() {
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!password) {
      toast.error("Enter your password to confirm.");
      return;
    }
    if (
      !confirm(
        "Permanently delete your account and ALL profiles, cycles, doses, labs, and measurements? This cannot be undone.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("password", password);
        await deleteAccountAction(formData);
        // On success the action redirects; this line is only reached on error.
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not delete account.",
        );
      }
    });
  }

  return (
    <div className="border-bad/30 rounded-2xl border p-6">
      <h2 className="text-bad font-display text-sm font-semibold tracking-wide uppercase">
        Danger zone
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Permanently delete your account and every profile&apos;s data. This
        can&apos;t be undone. Export your data first if you want a copy.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="deletePassword" className="text-sm font-medium">
            Confirm your password
          </label>
          <Input
            id="deletePassword"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-56"
          />
        </div>
        <Button variant="destructive" disabled={isPending} onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete account
        </Button>
      </div>
    </div>
  );
}
