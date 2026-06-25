"use server";

import { randomUUID } from "node:crypto";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload a progress photo to Vercel Blob with **private** access (these are
 * sensitive health photos). We store the blob's pathname on `Photo.path` and
 * serve the image through the login-gated route `/api/photos/[id]`, which streams
 * the private blob — so photos are never on a public URL.
 * Requires BLOB_READ_WRITE_TOKEN (auto-set on Vercel; `vercel env pull` locally).
 */
export async function uploadPhoto(formData: FormData) {
  const user = await getActiveUser();
  const file = formData.get("file");
  const caption = String(formData.get("caption") ?? "").trim();
  const takenAt = String(formData.get("takenAt") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose an image file.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("Unsupported image type (use JPG, PNG, WebP, or GIF).");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image too large (max 12 MB).");
  }

  const filename = `photos/${user.id}/${randomUUID()}.${EXT[file.type]}`;
  const blob = await put(filename, file, {
    access: "private",
    contentType: file.type,
  });

  await prisma.photo.create({
    data: {
      userId: user.id,
      path: blob.pathname, // store pathname; served via /api/photos/[id]
      caption: caption || null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    },
  });
  revalidatePath("/photos");
}

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.delete({ where: { id } });
  // Best-effort blob cleanup.
  try {
    await del(photo.path);
  } catch {
    // blob may already be gone; ignore
  }
  revalidatePath("/photos");
}
