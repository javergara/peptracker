"use client";

import { useTransition } from "react";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copyDay } from "@/lib/actions/food";

/** "Copy yesterday" — clones the previous day's logs onto the viewed day. */
export function CopyDayButton({
  fromDate,
  toDate,
  label = "Copy yesterday",
}: {
  fromDate: string;
  toDate: string;
  label?: string;
}) {
  const [isPending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("fromDate", fromDate);
          fd.set("toDate", toDate);
          try {
            await copyDay(fd);
            toast.success("Day copied");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Could not copy that day.",
            );
          }
        })
      }
    >
      <CopyPlus className="size-3.5" />
      {label}
    </Button>
  );
}
