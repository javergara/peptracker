"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const PendingContext = React.createContext(false);
export const useActionPending = () => React.useContext(PendingContext);

/**
 * Client wrapper for a server-action form that gives the user real feedback:
 * disables inputs + shows a spinner while pending, toasts on success, and shows
 * the thrown error message as a toast (instead of a blank/failed submit). Use
 * with `<SubmitButton>` for the pending spinner. Keeps inputs uncontrolled.
 */
export function ActionForm({
  action,
  success = "Saved",
  resetOnSuccess = true,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void> | void;
  success?: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(success);
        if (resetOnSuccess) form.reset();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className={className}>
        {/* display:contents keeps the grid layout; `disabled` still cascades. */}
        <fieldset disabled={pending} className="contents">
          {children}
        </fieldset>
      </form>
    </PendingContext.Provider>
  );
}

/** Submit button that shows a spinner + disables while the ActionForm is pending. */
export function SubmitButton({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const pending = useActionPending();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
