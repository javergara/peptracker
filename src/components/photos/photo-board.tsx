"use client";

import * as React from "react";
import { ImageIcon, X, ZoomIn } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Eyebrow } from "@/components/common/eyebrow";
import { DeletePhotoButton } from "@/components/photos/delete-photo-button";

export interface PhotoItem {
  id: string;
  caption: string | null;
  dateLabel: string;
}

const selectCls =
  "border-input bg-background focus-visible:ring-ring max-w-[60%] truncate rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2";

const src = (id: string) => `/api/photos/${id}`;

export function PhotoBoard({ photos }: { photos: PhotoItem[] }) {
  // `photos` arrives newest-first (listPhotos desc); chronological is oldest-first.
  const chronological = React.useMemo(() => [...photos].reverse(), [photos]);
  const oldest = chronological[0];
  const newest = chronological[chronological.length - 1];
  const byId = React.useMemo(
    () => new Map(photos.map((p) => [p.id, p])),
    [photos],
  );

  // Default: oldest = Before, newest = After (selectable below).
  const [beforeId, setBeforeId] = React.useState(oldest?.id ?? "");
  const [afterId, setAfterId] = React.useState(newest?.id ?? "");
  const [zoomId, setZoomId] = React.useState<string | null>(null);

  const before = byId.get(beforeId) ?? oldest;
  const after = byId.get(afterId) ?? newest;
  const showBeforeAfter = photos.length >= 2;

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
                    <ZoomButton
                      id={photo.id}
                      alt={photo.caption ?? label}
                      onZoom={() => setZoomId(photo.id)}
                      className="bg-muted/30 h-[30rem]"
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
          </div>
        </div>
      ) : null}

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
              className="card-surface group relative overflow-hidden rounded-xl transition-shadow hover:[box-shadow:var(--shadow-card-hover)]"
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
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DeletePhotoButton id={photo.id} />
              </div>
            </div>
          ))}
        </div>
      )}

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
        className={`w-full rounded-lg object-contain ${className ?? ""}`}
      />
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition group-hover/zoom:bg-black/10 group-hover/zoom:opacity-100">
        <ZoomIn className="size-6 text-white drop-shadow" />
      </span>
    </button>
  );
}
