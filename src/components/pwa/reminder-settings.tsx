"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/actions/notifications";

type State =
  | "loading"
  | "unsupported"
  | "needs-install" // iOS requires the PWA be added to the home screen
  | "blocked" // notifications permission denied
  | "idle" // can enable
  | "enabled"
  | "working";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag for home-screen web apps.
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function ReminderSettings() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) return setState("unsupported");

      // On iOS, web push only works once the app is installed to the home screen.
      if (isIOS() && !isStandalone()) return setState("needs-install");

      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) return setState("enabled");
        if (Notification.permission === "denied") return setState("blocked");
        setState("idle");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setState("working");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push is not configured on the server.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "idle");
        return;
      }

      // Ensure the service worker is registered (it may not be in dev).
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
      const reg = await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });
      setState("enabled");
      toast.success("Dose reminders enabled");
    } catch (err) {
      setState("idle");
      toast.error(
        err instanceof Error ? err.message : "Could not enable reminders",
      );
    }
  }

  async function disable() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("idle");
      toast.success("Dose reminders turned off");
    } catch {
      setState("enabled");
      toast.error("Could not turn off reminders");
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Dose reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Get a daily push notification when you have doses due. Educational
          reminders only — not medical advice.
        </p>

        {state === "loading" ? (
          <Button variant="outline" disabled>
            <Loader2 className="size-4 animate-spin" />
            Checking…
          </Button>
        ) : null}

        {state === "unsupported" ? (
          <p className="text-muted-foreground text-sm">
            This browser doesn&apos;t support push notifications.
          </p>
        ) : null}

        {state === "needs-install" ? (
          <p className="text-muted-foreground text-sm">
            On iPhone, open this app in Safari, tap{" "}
            <span className="font-medium">Share → Add to Home Screen</span>,
            then launch it from your home screen to enable reminders.
          </p>
        ) : null}

        {state === "blocked" ? (
          <p className="text-muted-foreground text-sm">
            Notifications are blocked. Enable them for Peptra in your device
            settings, then reload.
          </p>
        ) : null}

        {state === "idle" || state === "working" ? (
          <Button onClick={enable} disabled={state === "working"}>
            {state === "working" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bell className="size-4" />
            )}
            Enable reminders
          </Button>
        ) : null}

        {state === "enabled" ? (
          <Button variant="outline" onClick={disable}>
            <BellOff className="size-4" />
            Turn off reminders
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
