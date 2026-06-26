"use server";

import { prisma } from "@/lib/db";
import { getActiveUser } from "@/lib/active-user";

/**
 * Web Push subscription management for PWA dose reminders. A subscription is the
 * browser/device push endpoint; it is stored against the active profile so the
 * reminder cron knows who to notify. Ownership is always scoped by the active
 * profile (never a raw id).
 */

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(sub: BrowserSubscription) {
  const user = await getActiveUser();
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription.");
  }

  // Endpoint is globally unique (one physical browser). Re-subscribing — e.g.
  // after switching profile on the same device — reassigns it to this profile.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth },
    update: { userId: user.id, p256dh, auth },
  });
}

export async function removePushSubscription(endpoint: string) {
  const user = await getActiveUser();
  if (!endpoint) return;
  // Scope the delete to the active profile so one account can't drop another's.
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
}
