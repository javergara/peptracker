"use client";

import * as React from "react";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const PAN_STEP = 24;

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/** Scale that makes a natural-size image exactly fill (cover) the box. */
function coverScale(nat: Size, box: Size) {
  return Math.max(box.width / nat.width, box.height / nat.height);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Clamp a center offset so the displayed image never leaves a gap at an edge. */
function clampOffset(offset: Point, disp: Size, box: Size): Point {
  const maxX = Math.max(0, (disp.width - box.width) / 2);
  const maxY = Math.max(0, (disp.height - box.height) / 2);
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };
}

/**
 * A photo pinned inside a fixed frame that can be repositioned: drag to pan,
 * pinch/scroll/buttons to zoom in. The floor is "fills the frame" (cover) —
 * it never zooms out into letterboxing. Adjustments are per-instance and
 * session-only; remount (key by photo id) to reset.
 */
export function AdjustablePhoto({
  src,
  alt,
  onExpand,
  className,
}: {
  src: string;
  alt: string;
  onExpand: () => void;
  className?: string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const pointers = React.useRef(new Map<number, Point>());
  const [nat, setNat] = React.useState<Size | null>(null);
  const [box, setBox] = React.useState<Size | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);

  const scale = nat && box ? coverScale(nat, box) * zoom : null;
  const disp =
    nat && scale
      ? { width: nat.width * scale, height: nat.height * scale }
      : null;
  // Clamp at render so zoom-out / frame resizes can never expose a gap.
  const shown = disp && box ? clampOffset(offset, disp, box) : offset;
  const adjusted = zoom !== 1 || shown.x !== 0 || shown.y !== 0;

  // Track the frame's rendered size.
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom toward a focal point `q` (in frame coords relative to its center).
  const applyZoom = React.useCallback(
    (nextZoom: number, focal?: Point) => {
      if (!nat || !box) return;
      const z = clamp(nextZoom, 1, MAX_ZOOM);
      const ratio = z / zoom;
      const q = focal ?? { x: 0, y: 0 };
      const base = coverScale(nat, box);
      const dPrev = {
        width: nat.width * base * zoom,
        height: nat.height * base * zoom,
      };
      const dNext = {
        width: nat.width * base * z,
        height: nat.height * base * z,
      };
      setOffset((o) => {
        const c = clampOffset(o, dPrev, box);
        return clampOffset(
          { x: q.x - (q.x - c.x) * ratio, y: q.y - (q.y - c.y) * ratio },
          dNext,
          box,
        );
      });
      setZoom(z);
    },
    [nat, box, zoom],
  );

  const panBy = React.useCallback(
    (dx: number, dy: number) => {
      if (!nat || !box) return;
      const s = coverScale(nat, box) * zoom;
      const d = { width: nat.width * s, height: nat.height * s };
      setOffset((o) => {
        const c = clampOffset(o, d, box);
        return clampOffset({ x: c.x + dx, y: c.y + dy }, d, box);
      });
    },
    [nat, box, zoom],
  );

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      applyZoom(zoom * Math.exp(-e.deltaY * 0.002), {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom, zoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    boxRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pts = pointers.current;
    const prev = pts.get(e.pointerId);
    if (!prev || !nat || !box) return;
    const next = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, next);

    if (pts.size === 1) {
      panBy(next.x - prev.x, next.y - prev.y);
      return;
    }
    // Pinch: zoom by the change in distance to the other pointer, at the midpoint.
    const other = [...pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (!other) return;
    const prevDist = Math.hypot(prev.x - other.x, prev.y - other.y);
    const nextDist = Math.hypot(next.x - other.x, next.y - other.y);
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || prevDist === 0) return;
    applyZoom(zoom * (nextDist / prevDist), {
      x: (next.x + other.x) / 2 - rect.left - rect.width / 2,
      y: (next.y + other.y) / 2 - rect.top - rect.height / 2,
    });
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
    };
    if (pan[e.key]) {
      e.preventDefault();
      panBy(...pan[e.key]);
    } else if (e.key === "+" || e.key === "=") {
      applyZoom(zoom * ZOOM_STEP);
    } else if (e.key === "-") {
      applyZoom(zoom / ZOOM_STEP);
    } else if (e.key === "0") {
      reset();
    }
  };

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      aria-label={`${alt} — drag to reposition, pinch or scroll to zoom, arrow keys to pan`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-visible:ring-ring bg-muted/30 relative touch-none overflow-hidden rounded-lg outline-none select-none focus-visible:ring-2",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) =>
          setNat({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          })
        }
        className={
          disp && box
            ? "pointer-events-none absolute max-w-none"
            : "pointer-events-none h-full w-full object-cover"
        }
        style={
          disp && box
            ? {
                width: disp.width,
                height: disp.height,
                left: (box.width - disp.width) / 2 + shown.x,
                top: (box.height - disp.height) / 2 + shown.y,
              }
            : undefined
        }
      />

      <div className="absolute top-2 right-2 flex gap-1">
        <ControlButton
          label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => applyZoom(zoom / ZOOM_STEP)}
        >
          <ZoomOut className="size-3.5" />
        </ControlButton>
        <ControlButton
          label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => applyZoom(zoom * ZOOM_STEP)}
        >
          <ZoomIn className="size-3.5" />
        </ControlButton>
        {adjusted ? (
          <ControlButton label="Reset view" onClick={reset}>
            <RotateCcw className="size-3.5" />
          </ControlButton>
        ) : null}
        <ControlButton label="View full photo" onClick={onExpand}>
          <Maximize2 className="size-3.5" />
        </ControlButton>
      </div>

      {adjusted ? (
        <span className="num absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
          {Math.round(zoom * 100)}%
        </span>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-full bg-black/45 p-1.5 text-white transition outline-none hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:hover:bg-black/45"
    >
      {children}
    </button>
  );
}
