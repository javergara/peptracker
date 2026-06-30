"use client";

import { Calculator } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReconstitutionCalculator } from "@/components/peptides/reconstitution-calculator";

/**
 * Quick-access reconstitution calculator launched from the sidebar nav.
 * The trigger matches the nav-link styling; the calculator opens in a centered
 * dialog (no peptideId → generic calc, no "Save as vial").
 */
export function SidebarCalculator({ onOpen }: { onOpen?: () => void }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            onClick={onOpen}
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          />
        }
      >
        <Calculator className="size-4 shrink-0" />
        Calculator
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-transparent p-0 ring-0"
      >
        <DialogTitle className="sr-only">Reconstitution calculator</DialogTitle>
        <ReconstitutionCalculator />
      </DialogContent>
    </Dialog>
  );
}
