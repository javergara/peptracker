import { NotebookPen, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { EmptyState } from "@/components/common/empty-state";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { JournalEntryRow } from "@/components/journal/journal-entry-row";
import { createJournalEntry } from "@/lib/actions/journal";
import { listJournalEntries, getCurrentUser } from "@/lib/queries";

export const metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function JournalPage() {
  const [entries, user] = await Promise.all([
    listJournalEntries(),
    getCurrentUser(),
  ]);

  const accentColor = user.color ?? undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Journal"
        description="Free-text notes — how you're feeling, observations, anything worth remembering."
        accentColor={accentColor}
      />

      {/* Add entry form */}
      <div className="card-surface mb-8 rounded-[18px]">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">New entry</Eyebrow>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Plus className="size-4" />
            Add journal entry
          </h2>
        </div>
        <div className="px-5 py-4">
          <ActionForm
            action={createJournalEntry}
            success="Journal entry added"
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label htmlFor="journal-body" className="text-sm font-medium">
                Entry <span className="text-destructive">*</span>
              </label>
              <textarea
                id="journal-body"
                name="body"
                required
                rows={4}
                placeholder="What's on your mind?"
                className={textareaCls}
              />
            </div>
            <div className="flex items-center justify-end">
              <SubmitButton>
                <NotebookPen className="size-4" />
                Add entry
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-6" />}
          title="No journal entries yet"
          description="Add your first note above to start keeping a free-text journal alongside your protocols."
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <JournalEntryRow
              key={entry.id}
              entry={entry}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
