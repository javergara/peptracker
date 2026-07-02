"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";

import { adjustStockQuantity, deleteStock } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";

/**
 * Quantity ± steppers for a stock item, plus delete. Adjusting nudges the
 * reserve count (clamped ≥ 0); delete removes the reserve row entirely.
 */
export function StockQuantityControls({
  id,
  quantity,
}: {
  id: string;
  quantity: number;
}) {
  const [isPending, startTransition] = useTransition();

  function adjust(delta: number) {
    startTransition(async () => {
      try {
        await adjustStockQuantity(id, delta);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update stock.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteStock(id);
        toast.success("Stock item removed");
      } catch {
        toast.error("Could not remove stock item.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isPending || quantity <= 0}
        aria-label="Decrease quantity"
        onClick={() => adjust(-1)}
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="num min-w-6 text-center text-sm font-semibold">
        {quantity}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isPending}
        aria-label="Increase quantity"
        onClick={() => adjust(1)}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        aria-label="Remove stock item"
        className="ml-1"
        onClick={remove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
