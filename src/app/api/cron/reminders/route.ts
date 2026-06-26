import { NextResponse } from "next/server";

import { computeOverdue } from "@/lib/adherence";
import { prisma } from "@/lib/db";
import { sendPush, type PushPayload } from "@/lib/push";
import {
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";

/**
 * Daily reminder cron. Vercel invokes this on the schedule in `vercel.json` with
 * `Authorization: Bearer $CRON_SECRET`. For every profile that has a push
 * subscription, it computes doses still due today + overdue (reusing the same
 * adherence math the dashboard uses) and sends a Web Push notification. Stale
 * subscriptions (HTTP 410/404) are pruned.
 *
 * NOTE: Vercel Hobby (free) only allows once-daily crons, so this ships as a
 * single morning "due today" reminder. Finer cadence needs a paid plan or the
 * native APNs path (Phase 2).
 */

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handler(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, profiles: 0, sent: 0, pruned: 0 });
  }

  // Group subscriptions by profile.
  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = byUser.get(s.userId) ?? [];
    arr.push(s);
    byUser.set(s.userId, arr);
  }

  let sent = 0;
  let pruned = 0;
  const eightDaysAgo = new Date(now.getTime() - 8 * 86_400_000);

  for (const [userId, userSubs] of byUser) {
    const [cycles, logs] = await Promise.all([
      prisma.cycle.findMany({
        where: { userId, status: "active" },
        include: { peptide: true, stack: true },
      }),
      prisma.doseLog.findMany({
        where: { userId, takenAt: { gte: eightDaysAgo } },
        select: { takenAt: true },
      }),
    ]);

    const cycleLikes: CycleLike[] = cycles.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      scheduleConfig: c.scheduleConfig as ScheduleConfig | null,
      peptide: c.peptide ? { name: c.peptide.name } : null,
      stack: c.stack ? { name: c.stack.name } : null,
    }));

    const dueToday = getTodaysDoses(cycleLikes, now).reduce(
      (sum, t) => sum + t.times,
      0,
    );
    const loggedToday = logs.filter((l) => sameDay(l.takenAt, now)).length;
    const remainingToday = Math.max(0, dueToday - loggedToday);
    const overdue = computeOverdue(cycleLikes, logs, now).reduce(
      (sum, d) => sum + d.missed,
      0,
    );

    if (remainingToday === 0 && overdue === 0) continue;

    const parts: string[] = [];
    if (remainingToday > 0) {
      parts.push(
        `${remainingToday} dose${remainingToday === 1 ? "" : "s"} due today`,
      );
    }
    if (overdue > 0) parts.push(`${overdue} overdue`);

    const payload: PushPayload = {
      title: "Peptra reminder",
      body: parts.join(" · "),
      url: "/log",
      tag: "peptra-reminder",
    };

    for (const s of userSubs) {
      const ok = await sendPush(s, payload);
      if (ok) {
        sent++;
      } else {
        await prisma.pushSubscription
          .delete({ where: { id: s.id } })
          .catch(() => {});
        pruned++;
      }
    }
  }

  return NextResponse.json({ ok: true, profiles: byUser.size, sent, pruned });
}

export const GET = handler;
export const POST = handler;
