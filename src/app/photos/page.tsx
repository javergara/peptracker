import { Camera } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Eyebrow } from "@/components/common/eyebrow";
import { PhotoBoard } from "@/components/photos/photo-board";
import { PhotoFileInput } from "@/components/photos/photo-file-input";
import { ActionForm, SubmitButton } from "@/components/common/action-form";
import { uploadPhoto } from "@/lib/actions/photos";
import { listPhotos, getCurrentUser } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Progress Photos" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function PhotosPage() {
  const [photos, user] = await Promise.all([listPhotos(), getCurrentUser()]);
  const accent = user.color ?? undefined;

  // Shape for the client board (newest-first, as listPhotos returns).
  const items = photos.map((p) => ({
    id: p.id,
    caption: p.caption,
    dateLabel: formatDate(p.takenAt, "MMM d, yyyy"),
    takenAt: p.takenAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Progress Photos"
        description="Visual record of your journey over time."
        accentColor={accent}
      />

      {/* Upload form */}
      <div className="card-surface mb-8 rounded-2xl">
        <div className="border-border border-b px-5 pt-4 pb-3">
          <Eyebrow className="mb-1">Upload</Eyebrow>
          <h2 className="text-base font-semibold tracking-tight">
            Add a photo
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Photos are stored privately and never shared.
          </p>
        </div>
        <div className="px-5 py-4">
          <ActionForm
            action={uploadPhoto}
            success="Photo uploaded"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5 lg:col-span-1">
              <label htmlFor="p-file" className="text-sm font-medium">
                Image <span className="text-destructive">*</span>
              </label>
              <PhotoFileInput id="p-file" className={inputCls} />
              <p className="text-muted-foreground text-xs">
                On a phone you can take a photo or pick one from your library.
                Large images are optimized before upload.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-caption" className="text-sm font-medium">
                Caption
              </label>
              <input
                id="p-caption"
                name="caption"
                placeholder="e.g. Week 4 front"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-date" className="text-sm font-medium">
                Date taken
              </label>
              <input
                id="p-date"
                name="takenAt"
                type="date"
                className={inputCls}
              />
            </div>
            <div className="flex items-end">
              <SubmitButton className="w-full sm:w-auto">
                <Camera className="size-4" />
                Upload
              </SubmitButton>
            </div>
          </ActionForm>
        </div>
      </div>

      {/* Before/After (selectable) + zoomable gallery */}
      <PhotoBoard photos={items} />
    </div>
  );
}

export const dynamic = "force-dynamic";
