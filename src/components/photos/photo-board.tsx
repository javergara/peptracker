"use client";

import * as React from "react";
import Link from "next/link";
import { ImageIcon, X, ZoomIn } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { AdjustablePhoto } from "@/components/photos/adjustable-photo";
import { DeletePhotoButton } from "@/components/photos/delete-photo-button";
import { EditPhotoButton } from "@/components/photos/edit-photo-button";
import { PhotoTimeline } from "@/components/photos/photo-timeline";
import { cn } from "@/lib/utils";

export interface PhotoItem {
  id: string;
  caption: string | null;
  dateLabel: string;
  takenAt: string; // ISO — feeds EditPhotoButton's date input
}

const selectCls =
  "border-input bg-background focus-visible:ring-ring max-w-[60%] truncate rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2";

const src = (id: string) => `/api/photos/${id}`;

export function PhotoBoard({
  gallery,
  all,
  page,
  totalPages,
}: {
  /** Current page of the paginated grid (newest-first). */
  gallery: PhotoItem[];
  /** The FULL chronological history (newest-first) — feeds Before/After + Timeline, which need the whole set regardless of gallery pagination. */
  all: PhotoItem[];
  page: number;
  totalPages: number;
}) {
  // `all` arrives newest-first (listPhotoMeta desc); chronological is oldest-first.
  const chronological = React.useMemo(() => [...all].reverse(), [all]);
  const oldest = chronological[0];
  const newest = chronological[chronological.length - 1];
  const byId = React.useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  // Default: oldest = Before, newest = After (selectable below).
  const [beforeId, setBeforeId] = React.useState(oldest?.id ?? "");
  const [afterId, setAfterId] = React.useState(newest?.id ?? "");
  const [zoomId, setZoomId] = React.useState<string | null>(null);

  const before = byId.get(beforeId) ?? oldest;
  const after = byId.get(afterId) ?? newest;
  const showBeforeAfter = all.length >= 2;

  // Close the lightbox on Escape.
  React.useEffect(() => {
    if (!zoomId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomId]);

  return (
    <>
      {showBeforeAfter ? (
        <div className="card-surface mb-8 rounded-2xl">
          <div className="border-border border-b px-5 pt-4 pb-3">
            <Eyebrow className="mb-1">Comparison</Eyebrow>
            <h2 className="text-base font-semibold tracking-tight">
              Before &amp; After
            </h2>
          </div>
          <div className="px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    label: "Before",
                    photo: before,
                    value: before?.id,
                    set: setBeforeId,
                  },
                  {
                    label: "After",
                    photo: after,
                    value: after?.id,
                    set: setAfterId,
                  },
                ] as const
              ).map(({ label, photo, value, set }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Eyebrow>{label}</Eyebrow>
                    <select
                      value={value ?? ""}
                      onChange={(e) => set(e.target.value)}
                      className={selectCls}
                      aria-label={`${label} photo`}
                    >
                      {chronological.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.dateLabel}
                          {p.caption ? ` · ${p.caption}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {photo ? (
                    <AdjustablePhoto
                      key={photo.id}
                      src={src(photo.id)}
                      alt={photo.caption ?? label}
                      onExpand={() => setZoomId(photo.id)}
                      className="h-[30rem]"
                    />
                  ) : null}
                  {photo ? (
                    <p className="text-muted-foreground num text-xs">
                      {photo.dateLabel}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Drag to reposition · pinch, scroll, or use the buttons to zoom in.
              Photos always fill their frame.
            </p>
          </div>
        </div>
      ) : null}

      {showBeforeAfter ? (
        <div className="card-surface mb-8 rounded-2xl">
          <div className="border-border border-b px-5 pt-4 pb-3">
            <Eyebrow className="mb-1">Timeline</Eyebrow>
            <h2 className="text-base font-semibold tracking-tight">
              Progress over time
            </h2>
          </div>
          <div className="px-5 py-4">
            <PhotoTimeline photos={chronological} onZoom={setZoomId} />
          </div>
        </div>
      ) : null}

      {all.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="size-6" />}
          title="No photos yet"
          description="Upload your first progress photo above to start your visual timeline."
        />
      ) : gallery.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="size-6" />}
          title="No photos on this page"
          action={
            <Link
              href="/photos"
              className="text-primary text-sm font-medium hover:underline"
            >
              Back to page 1
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {gallery.map((photo) => (
            <div
              key={photo.id}
              className="card-surface group relative overflow-hidden rounded-xl"
            >
              <ZoomButton
                id={photo.id}
                alt={photo.caption ?? "Progress photo"}
                onZoom={() => setZoomId(photo.id)}
                className="bg-muted/20 h-64"
              />
              <div className="p-3">
                <p className="num text-xs font-medium">{photo.dateLabel}</p>
                {photo.caption ? (
                  <p className="text-muted-foreground truncate text-xs">
                    {photo.caption}
                  </p>
                ) : null}
              </div>
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <EditPhotoButton
                  id={photo.id}
                  caption={photo.caption}
                  takenAt={photo.takenAt}
                />
                <DeletePhotoButton id={photo.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={page > 1 ? `/photos?page=${page - 1}` : "/photos"}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            className={cn(
              "hover:bg-accent rounded-lg border px-2.5 py-1.5 text-sm",
              page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            Prev
          </Link>
          <span className="text-muted-foreground num text-sm">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/photos?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
            className={cn(
              "hover:bg-accent rounded-lg border px-2.5 py-1.5 text-sm",
              page >= totalPages && "pointer-events-none opacity-40",
            )}
          >
            Next
          </Link>
        </div>
      ) : null}

      {zoomId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomId(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(zoomId)}
            alt="Progress photo"
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomId(null)}
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}

function ZoomButton({
  id,
  alt,
  onZoom,
  className,
}: {
  id: string;
  alt: string;
  onZoom: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onZoom}
      className="group/zoom relative block w-full cursor-zoom-in"
      aria-label="Zoom photo"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src(id)}
        alt={alt}
        width={640}
        height={480}
        className={`w-full rounded-lg object-contain ${className ?? ""}`}
      />
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition group-hover/zoom:bg-black/10 group-hover/zoom:opacity-100">
        <ZoomIn className="size-6 text-white drop-shadow" />
      </span>
    </button>
  );
}
