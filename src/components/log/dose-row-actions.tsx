import Link from "next/link";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteDoseButton } from "@/components/log/delete-dose-button";

/** Edit + delete controls for a logged-dose row. */
export function DoseRowActions({ id }: { id: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Edit dose"
        render={<Link href={`/log/${id}/edit`} />}
      >
        <Pencil className="size-4" />
      </Button>
      <DeleteDoseButton id={id} />
    </div>
  );
}
