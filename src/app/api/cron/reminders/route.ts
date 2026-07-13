import { NextResponse } from "next/server";

import { computeOverdue } from "@/lib/adherence";
import { prisma } from "@/lib/db";
import { sendPush, type PushPayload } from "@/lib/push";
import {
  getTodaysDoses,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";
import { computeStockLevels, isLowStock } from "@/lib/stock";
import { vialExpiryStatus } from "@/lib/vials";
import { zonedToday } from "@/lib/dates";

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
    const [profile, cycles, logs, dueRechecks, stock, vials] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { timezone: true },
        }),
        prisma.cycle.findMany({
          where: { userId, status: "active" },
          include: { peptide: true, stack: true },
        }),
        prisma.doseLog.findMany({
          where: { userId, takenAt: { gte: eightDaysAgo } },
          // cycleId/peptideId are needed so adherence matches each dose to the
          // administration it satisfies (not a raw day count).
          select: { takenAt: true, cycleId: true, peptideId: true },
        }),
        // Lab rechecks that are due and not yet completed.
        prisma.labReminder.findMany({
          where: { userId, completedAt: null, dueAt: { lte: now } },
          select: { id: true, label: true, lastNotifiedAt: true },
        }),
        prisma.stockItem.findMany({
          where: { userId },
          select: {
            peptideId: true,
            quantity: true,
            vialMcg: true,
            dose: true,
            doseUnit: true,
            frequency: true,
            peptide: { select: { name: true } },
          },
        }),
        prisma.vial.findMany({
          where: { userId, status: { in: ["active", "sealed"] } },
          select: {
            peptideId: true,
            status: true,
            remainingMcg: true,
            expiresAt: true,
            peptide: { select: { name: true } },
          },
        }),
      ]);

    // Compute "today" in the user's own timezone (the cron runs in UTC), so a
    // dose due on their calendar day isn't missed/duplicated near midnight.
    const today = zonedToday(now, profile?.timezone ?? null);

    // Don't re-notify a recheck more than once per day.
    const freshRechecks = dueRechecks.filter(
      (r) => !r.lastNotifiedAt || !sameDay(r.lastNotifiedAt, today),
    );

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

    const dueToday = getTodaysDoses(cycleLikes, today).reduce(
      (sum, t) => sum + t.times,
      0,
    );
    const loggedToday = logs.filter((l) => sameDay(l.takenAt, today)).length;
    const remainingToday = Math.max(0, dueToday - loggedToday);
    const overdue = computeOverdue(cycleLikes, logs, today).reduce(
      (sum, d) => sum + d.missed,
      0,
    );

    // Inventory nudges: vials expiring within 7 days (or already expired) and
    // peptides running low on supply — both already computed elsewhere, folded
    // into the same daily push (no second cron).
    const expiringSoon = vials.filter((v) => {
      const status = vialExpiryStatus(v.expiresAt, now);
      return status === "soon" || status === "expired";
    }).length;
    const lowStock = computeStockLevels(
      stock.map((s) => ({
        peptideId: s.peptideId,
        peptideName: s.peptide.name,
        quantity: s.quantity,
        vialMcg: s.vialMcg,
        dose: s.dose,
        doseUnit: s.doseUnit,
        frequency: s.frequency,
      })),
      vials.map((v) => ({
        peptideId: v.peptideId,
        peptideName: v.peptide.name,
        status: v.status,
        remainingMcg: v.remainingMcg,
      })),
    ).filter((l) => isLowStock(l)).length;

    if (
      remainingToday === 0 &&
      overdue === 0 &&
      freshRechecks.length === 0 &&
      expiringSoon === 0 &&
      lowStock === 0
    ) {
      continue;
    }

    const parts: string[] = [];
    if (remainingToday > 0) {
      parts.push(
        `${remainingToday} dose${remainingToday === 1 ? "" : "s"} due today`,
      );
    }
    if (overdue > 0) parts.push(`${overdue} overdue`);
    if (freshRechecks.length > 0) {
      parts.push(
        `${freshRechecks.length} lab recheck${freshRechecks.length === 1 ? "" : "s"} due`,
      );
    }
    if (expiringSoon > 0) {
      parts.push(
        `${expiringSoon} vial${expiringSoon === 1 ? "" : "s"} expiring`,
      );
    }
    if (lowStock > 0) {
      parts.push(
        `${lowStock} peptide${lowStock === 1 ? "" : "s"} low on stock`,
      );
    }

    const hasDoses = remainingToday > 0 || overdue > 0;
    const inventoryOnly =
      !hasDoses &&
      freshRechecks.length === 0 &&
      (expiringSoon > 0 || lowStock > 0);
    const payload: PushPayload = {
      title: "Peptra reminder",
      body: parts.join(" · "),
      url: hasDoses ? "/log" : inventoryOnly ? "/inventory" : "/labs",
      tag: "peptra-reminder",
    };

    let delivered = false;
    for (const s of userSubs) {
      const ok = await sendPush(s, payload);
      if (ok) {
        sent++;
        delivered = true;
      } else {
        await prisma.pushSubscription
          .delete({ where: { id: s.id } })
          .catch(() => {});
        pruned++;
      }
    }

    // Stamp rechecks as notified (only if at least one push went out).
    if (delivered && freshRechecks.length > 0) {
      await prisma.labReminder.updateMany({
        where: { id: { in: freshRechecks.map((r) => r.id) } },
        data: { lastNotifiedAt: now },
      });
    }
  }

  return NextResponse.json({ ok: true, profiles: byUser.size, sent, pruned });
}

export const GET = handler;
export const POST = handler;
