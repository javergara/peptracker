import { Camera } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { PhotoBoard } from "@/components/photos/photo-board";
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

  // Shape for the client board (newest-first, as listPhotos returns).
  const items = photos.map((p) => ({
    id: p.id,
    caption: p.caption,
    dateLabel: formatDate(p.takenAt, "MMM d, yyyy"),
  }));

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

      {/* Before/After (selectable) + zoomable gallery */}
      <PhotoBoard photos={items} />
    </div>
  );
}

export const dynamic = "force-dynamic";
