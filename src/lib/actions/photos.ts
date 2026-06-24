"use server";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload a progress photo. Writes the file to public/uploads/<id>.<ext> (local
 * filesystem — for self-hosting; production should swap to object storage) and
 * records a Photo row referencing the public path.
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

  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = randomUUID();
  const filename = `${id}.${EXT[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  await prisma.photo.create({
    data: {
      userId: user.id,
      path: `/uploads/${filename}`,
      caption: caption || null,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    },
  });
  revalidatePath("/photos");
}

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.delete({ where: { id } });
  // Best-effort file cleanup.
  try {
    await unlink(
      path.join(process.cwd(), "public", photo.path.replace(/^\//, "")),
    );
  } catch {
    // file may already be gone; ignore
  }
  revalidatePath("/photos");
}
