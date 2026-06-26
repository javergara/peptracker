import "server-only";

import webpush from "web-push";

/**
 * Server-side Web Push sender (VAPID). Used by the reminder cron route. The
 * public key is also exposed to the browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY so
 * the client can subscribe with a matching application server key.
 */

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@peptra.app";
  if (!publicKey || !privateKey) {
    throw new Error(
      "Web Push is not configured (set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY).",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push to one subscription. Returns `true` on success, `false` when the
 * subscription is gone (HTTP 404/410) and the caller should delete it. Other
 * errors propagate.
 */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<boolean> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return false;
    throw err;
  }
}
