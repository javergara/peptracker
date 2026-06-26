/*
 * Peptra service worker (hand-written, no bundler step — works regardless of
 * Turbopack/webpack). Two jobs:
 *   1. Offline support — precache a static fallback page + brand assets, and
 *      runtime-cache content-hashed static assets and the PUBLIC peptide library.
 *   2. Web push — receive `push` events and show dose reminders (iOS 16.4+ only
 *      delivers these to an installed/home-screen PWA).
 *
 * PRIVACY: we never cache `/api/*` (auth, photos, cron) or authenticated
 * per-profile pages (dashboard, log, metrics, …). Only the global peptide
 * library, static assets, and the offline page are persisted.
 */

const VERSION = "peptra-v1";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/peptra-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Treat these as cacheable public, content-hashed, or static assets.
function isStaticAsset(url, request) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/peptra-icon.svg" ||
    ["style", "script", "font", "image"].includes(request.destination)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin alone

  // Never touch API routes (auth, private photos, cron) — always network.
  if (url.pathname.startsWith("/api/")) return;

  // Full-page navigations: network-first, fall back to cache, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache only the PUBLIC library for offline browsing.
          if (url.pathname.startsWith("/peptides")) {
            const copy = response.clone();
            caches.open(RUNTIME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ??
            (await caches.match("/offline.html")),
        ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url, request)) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
  // Everything else (RSC data, private routes): default network, no caching.
});

// ---- Web push (dose reminders) -------------------------------------------

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Peptra";
  const options = {
    body: payload.body || "You have doses due.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || "peptra-reminder",
    data: { url: payload.url || "/log" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/log";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
