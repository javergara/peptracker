import { get } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { getAccountId } from "@/lib/active-user";

/**
 * Streams a private progress photo to the owner. Gated by the proxy (login
 * required) and additionally scoped to the requesting account's profiles, so one
 * account can never fetch another's photos. The blob itself is private in Vercel
 * Blob and only reachable through this route.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const accountId = await getAccountId();
  if (!accountId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const photo = await prisma.photo.findFirst({
    where: { id, user: { accountId } },
    select: { path: true },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  const result = await get(photo.path, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type":
        result.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
