"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

import type { PhotoItem } from "@/components/photos/photo-board";
import { cn } from "@/lib/utils";

const src = (id: string) => `/api/photos/${id}`;

/**
 * Chronological scrubber over all photos: one large stage + a date slider
 * (time-lapse style) + a clickable filmstrip. `photos` must be oldest-first.
 */
export function PhotoTimeline({
  photos,
  onZoom,
}: {
  photos: PhotoItem[];
  onZoom: (id: string) => void;
}) {
  // Default to the newest photo; clamp in case the list shrinks (delete).
  const [index, setIndex] = React.useState(photos.length - 1);
  const i = Math.min(index, photos.length - 1);
  const photo = photos[i];
  const stripRef = React.useRef<HTMLDivElement>(null);

  // Keep the active thumbnail in view as the slider moves.
  React.useEffect(() => {
    stripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [i]);

  if (photos.length < 2 || !photo) return null;

  return (
    <div className="space-y-4">
      {/* Stage */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onZoom(photo.id)}
          aria-label="Zoom photo"
          className="group/stage bg-muted/30 focus-visible:ring-ring relative block w-full cursor-zoom-in overflow-hidden rounded-lg outline-none focus-visible:ring-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src(photo.id)}
            alt={photo.caption ?? photo.dateLabel}
            className="h-[26rem] w-full object-contain"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/stage:bg-black/10 group-hover/stage:opacity-100">
            <ZoomIn className="size-6 text-white drop-shadow" />
          </span>
        </button>
        {/* Preload neighbors so scrubbing doesn't flash. */}
        {[photos[i - 1], photos[i + 1]].map((p) =>
          p ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={src(p.id)} alt="" className="hidden" />
          ) : null,
        )}
        <NavButton
          dir="prev"
          disabled={i === 0}
          onClick={() => setIndex(i - 1)}
        />
        <NavButton
          dir="next"
          disabled={i === photos.length - 1}
          onClick={() => setIndex(i + 1)}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="num text-xs font-medium">{photo.dateLabel}</p>
          {photo.caption ? (
            <p className="text-muted-foreground truncate text-xs">
              {photo.caption}
            </p>
          ) : null}
        </div>
        <p className="text-muted-foreground num shrink-0 text-xs">
          {i + 1} of {photos.length}
        </p>
      </div>

      {/* Scrubber */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={photos.length - 1}
          step={1}
          value={i}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Timeline position"
          aria-valuetext={photo.dateLabel}
          className="accent-primary block w-full"
        />
        <div className="text-muted-foreground num flex justify-between text-[10px]">
          <span>{photos[0].dateLabel}</span>
          <span>{photos[photos.length - 1].dateLabel}</span>
        </div>
      </div>

      {/* Filmstrip */}
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            data-active={idx === i ? "true" : undefined}
            aria-current={idx === i ? "true" : undefined}
            aria-label={`Go to ${p.dateLabel}`}
            title={p.caption ? `${p.dateLabel} · ${p.caption}` : p.dateLabel}
            onClick={() => setIndex(idx)}
            className="focus-visible:ring-ring w-16 shrink-0 space-y-1 rounded-md outline-none focus-visible:ring-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src(p.id)}
              alt=""
              className={cn(
                "bg-muted/30 h-16 w-16 rounded-md object-cover",
                idx === i
                  ? "ring-primary ring-2"
                  : "opacity-80 transition-opacity hover:opacity-100",
              )}
            />
            <span
              className={cn(
                "num block truncate text-[10px]",
                idx === i
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {p.dateLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NavButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition outline-none hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30",
        dir === "prev" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
