"use client";

import * as React from "react";
import { ImageDown, Loader2 } from "lucide-react";

/**
 * File picker that downscales + re-encodes the chosen image in the browser
 * BEFORE it's uploaded. This keeps stored blobs tiny (so far more users fit in
 * Vercel Blob's 1 GB free store and the 10 GB/mo transfer), and keeps the
 * upload payload small enough for Next's server-action body limit + Vercel's
 * function body cap.
 *
 * The visible input is unnamed (never submitted); the compressed result is
 * placed into a hidden `name="file"` input via DataTransfer, so the existing
 * `uploadPhoto` server action receives it unchanged. The hidden input is
 * `required`, which naturally blocks submit until optimization finishes.
 */

const MAX_EDGE = 1600; // longest side, px
const TARGET_BYTES = 900 * 1024; // stay under Next's 1 MB server-action default
const MIN_QUALITY = 0.45;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
}

async function compressImage(file: File): Promise<File> {
  // Pass through non-images and animated GIFs (canvas would flatten them).
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // e.g. HEIC the browser can't decode — let the server handle it
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // Prefer WebP; Safari may ignore it and fall back to PNG, in which case we
  // re-encode as JPEG (universally supported, good photo compression).
  let outType = "image/webp";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, outType, quality);
  if (!blob || blob.type !== "image/webp") {
    outType = "image/jpeg";
    blob = await canvasToBlob(canvas, outType, quality);
  }
  while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.12);
    blob = await canvasToBlob(canvas, outType, quality);
  }
  if (!blob) return file;
  // Don't ship a "compressed" file that's bigger than the original.
  if (blob.size >= file.size) return file;

  const ext = outType === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, { type: outType });
}

function formatKB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export function PhotoFileInput({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const [status, setStatus] = React.useState<
    "idle" | "working" | "ready" | "error"
  >("idle");
  const [note, setNote] = React.useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const hidden = hiddenRef.current;
    if (!hidden) return;
    if (!file) {
      hidden.value = "";
      setStatus("idle");
      setNote(null);
      return;
    }
    setStatus("working");
    setNote("Optimizing image…");
    try {
      const out = await compressImage(file);
      const dt = new DataTransfer();
      dt.items.add(out);
      hidden.files = dt.files;
      setStatus("ready");
      setNote(
        out === file
          ? `Ready · ${formatKB(file.size)}`
          : `Optimized · ${formatKB(file.size)} → ${formatKB(out.size)}`,
      );
    } catch {
      // Fall back to the original file so the user can still upload.
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        hidden.files = dt.files;
      } catch {
        // ignore
      }
      setStatus("error");
      setNote(
        `Couldn't optimize — uploading original (${formatKB(file.size)})`,
      );
    }
  }

  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/*"
        required
        onChange={onPick}
        className={className}
      />
      {/* Holds the compressed file actually submitted as `file`. */}
      <input ref={hiddenRef} type="file" name="file" required hidden />
      {note ? (
        <p
          className={
            "flex items-center gap-1.5 text-xs " +
            (status === "error"
              ? "text-warn-foreground"
              : "text-muted-foreground")
          }
        >
          {status === "working" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ImageDown className="size-3" />
          )}
          {note}
        </p>
      ) : null}
    </>
  );
}
