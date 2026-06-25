import { Camera, ImageIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { DeletePhotoButton } from "@/components/photos/delete-photo-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadPhoto } from "@/lib/actions/photos";
import { listPhotos, getCurrentUser } from "@/lib/queries";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Progress Photos" };

const inputCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export default async function PhotosPage() {
  const [photos, user] = await Promise.all([listPhotos(), getCurrentUser()]);
  const accent = user.color ?? undefined;

  // Before/after: oldest first by takenAt (listPhotos returns desc; reverse)
  const chronological = [...photos].sort(
    (a, b) => a.takenAt.getTime() - b.takenAt.getTime(),
  );
  const oldest = chronological[0];
  const newest =
    chronological.length > 1 ? chronological[chronological.length - 1] : null;
  const showBeforeAfter = oldest && newest && oldest.id !== newest.id;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Progress Photos"
        description="Visual record of your journey over time."
        accentColor={accent}
      />

      {/* Upload form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a photo</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={uploadPhoto}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5 lg:col-span-1">
              <label className="text-sm font-medium">
                Image <span className="text-destructive">*</span>
              </label>
              <input
                name="file"
                type="file"
                accept="image/*"
                required
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Caption</label>
              <input
                name="caption"
                placeholder="e.g. Week 4 front"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date taken</label>
              <input name="takenAt" type="date" className={inputCls} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full sm:w-auto">
                <Camera className="size-4" />
                Upload
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Before / after comparison */}
      {showBeforeAfter && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Before &amp; After</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Before", photo: oldest },
                { label: "After", photo: newest },
              ].map(({ label, photo }) => (
                <div key={photo.id} className="space-y-2">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {label}
                  </p>
                  <img
                    src={`/api/photos/${photo.id}`}
                    alt={photo.caption ?? label}
                    className="bg-muted/30 h-[30rem] w-full rounded-lg object-contain"
                  />
                  <p className="text-muted-foreground text-xs">
                    {formatDate(photo.takenAt, "MMM d, yyyy")}
                    {photo.caption ? ` · ${photo.caption}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gallery grid */}
      {photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="size-6" />}
          title="No photos yet"
          description="Upload your first progress photo above to start your visual timeline."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-card border-border group relative overflow-hidden rounded-xl border"
            >
              <img
                src={`/api/photos/${photo.id}`}
                alt={photo.caption ?? "Progress photo"}
                className="aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="text-xs font-medium">
                  {formatDate(photo.takenAt, "MMM d, yyyy")}
                </p>
                {photo.caption && (
                  <p className="text-muted-foreground truncate text-xs">
                    {photo.caption}
                  </p>
                )}
              </div>
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DeletePhotoButton id={photo.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
