/**
 * Peptra — profile data importer (read-first, dry-run, confirm, apply).
 *
 * Safely loads personal data into ONE user profile in whatever DATABASE_URL
 * points to (currently the shared Neon DB). It NEVER deletes and only writes
 * when you pass --apply. Used by the `import-profile` skill.
 *
 * Modes:
 *   tsx scripts/import-profile.ts --inspect [--email <email>]
 *       List an account's profiles + data counts (read-only). Use this first to
 *       get the target User.id.
 *
 *   tsx scripts/import-profile.ts --backup --user <userId>
 *       Dump the profile's current data to imports/backup-<userId>-<ts>.json.
 *
 *   tsx scripts/import-profile.ts --dry-run --file <import.json>
 *       Show exactly what would be inserted/updated. Writes nothing.
 *
 *   tsx scripts/import-profile.ts --apply --file <import.json>
 *       Apply the import (create/update only) inside per-category transactions.
 *
 * Import file shape (all sections optional; see imports/example.import.json):
 *   {
 *     "email": "...",            // optional, verified against userId if given
 *     "userId": "cmxxx",         // REQUIRED target profile
 *     "profile": { "heightCm": 180, "timezone": "America/Bogota", ... },
 *     "labs":         [{ "marker","value","unit?","refLow?","refHigh?","biomarkerSlug?","takenAt?" }],
 *     "measurements": [{ "type","value","unit?","label?","recordedAt?" }],
 *     "vials":        [{ "peptide","totalMcg","remainingMcg","status?","bacWaterMl?","expiresAt?","price?","label?" }],
 *     "stock":        [{ "peptide","vialMcg","quantity?","dose?","doseUnit?","frequency?","price?" }],
 *     "cycles":       [{ "name","startDate","endDate?","status?","peptide?","notes?","scheduleConfig?" }],
 *     "doses":        [{ "peptide","amount","unit?","takenAt?","route?","site?","mood?","energy?","notes?" }],
 *     "supplements":  [{ "name","startDate","category?","dose?","frequency?","timesPerDay?","timing?","endDate?","status?","notes?" }],
 *     "labReminders": [{ "label","dueAt","biomarkerSlug?","note?" }],
 *     "conditions":   [{ "name","status?","code?","system?","onsetDate?","notes?","biomarkerSlugs?","relatedPeptides?" }],
 *     "familyHistory":[{ "relative","condition","notes?" }]
 *   }
 * "peptide" resolves by slug, then name, then alias (case-insensitive).
 */
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function hostOf(url: string | undefined): string {
  if (!url) return "(unset)";
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
}

function dayBounds(d: Date) {
  const day = d.toISOString().slice(0, 10);
  return {
    day,
    gte: new Date(`${day}T00:00:00.000Z`),
    lt: new Date(`${day}T23:59:59.999Z`),
  };
}

// ── read-only inspect ──────────────────────────────────────────────────────
async function inspect(email?: string) {
  console.log(`\nDB host (DATABASE_URL): ${hostOf(process.env.DATABASE_URL)}`);
  if (!email) {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        _count: { select: { profiles: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      `\nAll accounts (${accounts.length}). Pass --email to drill in:\n`,
    );
    for (const a of accounts) {
      console.log(
        `  ${a.email.padEnd(32)} | ${a.name ?? ""} | profiles:${a._count.profiles} | ${a.id}`,
      );
    }
    return;
  }

  const account = await prisma.account.findUnique({
    where: { email },
    include: { profiles: { orderBy: { createdAt: "asc" } } },
  });
  if (!account) {
    console.log(
      `\n❌ No account found for ${email}. (Will not create accounts.)`,
    );
    return;
  }
  console.log(
    `\n✅ Account.id = ${account.id} · name = ${account.name ?? "(null)"} · profiles = ${account.profiles.length}\n`,
  );
  for (const p of account.profiles) {
    const [cycles, doses, vials, stock, labs, measurements, food] =
      await Promise.all([
        prisma.cycle.count({ where: { userId: p.id } }),
        prisma.doseLog.count({ where: { userId: p.id } }),
        prisma.vial.count({ where: { userId: p.id } }),
        prisma.stockItem.count({ where: { userId: p.id } }),
        prisma.labResult.count({ where: { userId: p.id } }),
        prisma.measurement.count({ where: { userId: p.id } }),
        prisma.foodLog.count({ where: { userId: p.id } }),
      ]);
    console.log(`── Profile "${p.name}" ─────────────────────────`);
    console.log(`   User.id    = ${p.id}`);
    console.log(
      `   sex/birth  = ${p.sex ?? "-"} / ${p.birthYear ?? "-"} · heightCm ${p.heightCm ?? "-"} · tz ${p.timezone ?? "-"}`,
    );
    console.log(`   units      = weight:${p.weightUnit} dose:${p.doseUnit}`);
    console.log(
      `   goals      = cal:${p.calorieGoal ?? "-"} pro:${p.proteinGoal ?? "-"} carb:${p.carbGoal ?? "-"} fat:${p.fatGoal ?? "-"} water:${p.waterGoal ?? "-"}`,
    );
    console.log(
      `   counts     = cycles:${cycles} doses:${doses} vials:${vials} stock:${stock} labs:${labs} meas:${measurements} food:${food}\n`,
    );
  }
}

// ── backup ─────────────────────────────────────────────────────────────────
async function backup(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`No profile with id ${userId}`);
  const [
    cycles,
    doses,
    vials,
    stock,
    labs,
    measurements,
    supplements,
    labReminders,
    conditions,
    familyHistory,
  ] = await Promise.all([
    prisma.cycle.findMany({ where: { userId } }),
    prisma.doseLog.findMany({ where: { userId } }),
    prisma.vial.findMany({ where: { userId } }),
    prisma.stockItem.findMany({ where: { userId } }),
    prisma.labResult.findMany({ where: { userId } }),
    prisma.measurement.findMany({ where: { userId } }),
    prisma.supplement.findMany({ where: { userId } }),
    prisma.labReminder.findMany({ where: { userId } }),
    prisma.condition.findMany({ where: { userId } }),
    prisma.familyHistoryEntry.findMany({ where: { userId } }),
  ]);
  mkdirSync("imports", { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `imports/backup-${userId}-${ts}.json`;
  writeFileSync(
    path,
    JSON.stringify(
      {
        user,
        cycles,
        doses,
        vials,
        stock,
        labs,
        measurements,
        supplements,
        labReminders,
        conditions,
        familyHistory,
      },
      null,
      2,
    ),
  );
  console.log(`✅ Backup written: ${path}`);
  console.log(
    `   cycles:${cycles.length} doses:${doses.length} vials:${vials.length} stock:${stock.length} labs:${labs.length} meas:${measurements.length} supps:${supplements.length} reminders:${labReminders.length} conditions:${conditions.length} family:${familyHistory.length}`,
  );
}

// ── peptide resolver ───────────────────────────────────────────────────────
async function buildPeptideResolver() {
  const peptides = await prisma.peptide.findMany({
    select: { id: true, slug: true, name: true, aliases: true },
  });
  const bySlug = new Map<string, string>();
  const byName = new Map<string, string>();
  const byAlias = new Map<string, string>();
  for (const p of peptides) {
    bySlug.set(p.slug.toLowerCase(), p.id);
    byName.set(p.name.toLowerCase(), p.id);
    const aliases = Array.isArray(p.aliases) ? (p.aliases as unknown[]) : [];
    for (const a of aliases)
      if (typeof a === "string") byAlias.set(a.toLowerCase(), p.id);
  }
  return (ref: string): string | null => {
    const k = ref.trim().toLowerCase();
    return bySlug.get(k) ?? byName.get(k) ?? byAlias.get(k) ?? null;
  };
}

type LabRow = {
  marker: string;
  value: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  biomarkerSlug?: string;
  takenAt?: string;
};
type MeasurementRow = {
  type: string;
  value: number;
  unit?: string;
  label?: string;
  recordedAt?: string;
};
type VialRow = {
  peptide: string;
  totalMcg: number;
  remainingMcg: number;
  status?: string;
  bacWaterMl?: number;
  concentrationMcgPerMl?: number;
  expiresAt?: string;
  reconstitutedAt?: string;
  price?: number;
  label?: string;
};
type StockRow = {
  peptide: string;
  vialMcg: number;
  quantity?: number;
  dose?: number;
  doseUnit?: string;
  frequency?: string;
  price?: number;
  notes?: string;
};
type CycleRow = {
  name: string;
  startDate: string;
  endDate?: string;
  status?: string;
  peptide?: string;
  notes?: string;
  washoutDays?: number;
  scheduleConfig?: unknown;
};
type DoseRow = {
  peptide: string;
  amount: number;
  unit?: string;
  takenAt?: string;
  route?: string;
  site?: string;
  mood?: number;
  energy?: number;
  notes?: string;
};
type SupplementRow = {
  name: string;
  startDate?: string;
  category?: string;
  dose?: string;
  frequency?: string;
  timesPerDay?: number;
  timing?: string;
  endDate?: string;
  status?: string;
  notes?: string;
};
type LabReminderRow = {
  label: string;
  dueAt: string;
  biomarkerSlug?: string;
  note?: string;
};
type ConditionRow = {
  name: string;
  status?: string;
  code?: string;
  system?: string;
  onsetDate?: string;
  notes?: string;
  biomarkerSlugs?: string[];
  relatedPeptides?: string[];
};
type FamilyHistoryRow = {
  relative: string;
  condition: string;
  notes?: string;
};

type ImportFile = {
  email?: string;
  userId: string;
  profile?: Record<string, unknown>;
  labs?: LabRow[];
  measurements?: MeasurementRow[];
  vials?: VialRow[];
  stock?: StockRow[];
  cycles?: CycleRow[];
  doses?: DoseRow[];
  supplements?: SupplementRow[];
  labReminders?: LabReminderRow[];
  conditions?: ConditionRow[];
  familyHistory?: FamilyHistoryRow[];
};

const PROFILE_FIELDS = new Set([
  "name",
  "sex",
  "birthYear",
  "heightCm",
  "timezone",
  "weightUnit",
  "doseUnit",
  "theme",
  "color",
  "calorieGoal",
  "proteinGoal",
  "carbGoal",
  "fatGoal",
  "fiberGoal",
  "sodiumGoal",
  "waterGoal",
]);

// ── dry-run / apply ────────────────────────────────────────────────────────
async function runImport(file: string, apply: boolean) {
  const data = JSON.parse(readFileSync(file, "utf8")) as ImportFile;
  if (!data.userId) throw new Error("import file must include userId");

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    include: { account: true },
  });
  if (!user) throw new Error(`No profile with id ${data.userId}`);
  if (
    data.email &&
    user.account?.email &&
    data.email.toLowerCase() !== user.account.email.toLowerCase()
  ) {
    throw new Error(
      `email mismatch: file says ${data.email} but profile belongs to ${user.account.email}`,
    );
  }

  console.log(
    `\n${apply ? "APPLY" : "DRY-RUN"} → profile "${user.name}" (${user.id})`,
  );
  console.log(`DB host: ${hostOf(process.env.DATABASE_URL)}\n`);

  const resolve = await buildPeptideResolver();
  const ops: (() => Promise<unknown>)[] = [];
  const unresolved: string[] = [];

  // profile settings
  if (data.profile) {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.profile)) {
      if (PROFILE_FIELDS.has(k)) patch[k] = v;
      else console.log(`  profile: ignoring unknown field "${k}"`);
    }
    if (Object.keys(patch).length) {
      console.log(`UPDATE profile ← ${JSON.stringify(patch)}`);
      ops.push(() =>
        prisma.user.update({ where: { id: user.id }, data: patch }),
      );
    }
  }

  // labs (dup guard: same marker on same day)
  for (const l of data.labs ?? []) {
    const takenAt = l.takenAt ? new Date(l.takenAt) : new Date();
    const { gte, lt, day } = dayBounds(takenAt);
    const dup = await prisma.labResult.findFirst({
      where: { userId: user.id, marker: l.marker, takenAt: { gte, lt } },
    });
    if (dup) {
      console.log(`SKIP lab (dup)  | ${l.marker} @ ${day}`);
      continue;
    }
    console.log(
      `INSERT lab      | ${String(l.marker).padEnd(34)} | ${l.value} ${l.unit ?? ""} | ref ${l.refLow ?? "-"}–${l.refHigh ?? "-"} | slug:${l.biomarkerSlug ?? "-"} @ ${day}`,
    );
    ops.push(() =>
      prisma.labResult.create({
        data: {
          userId: user.id,
          marker: l.marker,
          value: l.value,
          unit: l.unit ?? null,
          refLow: l.refLow ?? null,
          refHigh: l.refHigh ?? null,
          biomarkerSlug: l.biomarkerSlug ?? null,
          takenAt,
        },
      }),
    );
  }

  // measurements
  for (const m of data.measurements ?? []) {
    const recordedAt = m.recordedAt ? new Date(m.recordedAt) : new Date();
    console.log(
      `INSERT meas     | ${String(m.type).padEnd(10)} ${m.value} ${m.unit ?? ""} @ ${recordedAt.toISOString().slice(0, 10)}`,
    );
    ops.push(() =>
      prisma.measurement.create({
        data: {
          userId: user.id,
          type: m.type,
          value: m.value,
          unit: m.unit ?? null,
          label: m.label ?? null,
          recordedAt,
        },
      }),
    );
  }

  // vials
  for (const v of data.vials ?? []) {
    const pid = resolve(v.peptide);
    if (!pid) {
      unresolved.push(`vial:${v.peptide}`);
      console.log(`SKIP vial       | unresolved peptide "${v.peptide}"`);
      continue;
    }
    console.log(
      `INSERT vial     | ${v.peptide} total:${v.totalMcg} remaining:${v.remainingMcg} status:${v.status ?? "sealed"}`,
    );
    ops.push(() =>
      prisma.vial.create({
        data: {
          userId: user.id,
          peptideId: pid,
          totalMcg: v.totalMcg,
          remainingMcg: v.remainingMcg,
          status: v.status ?? "sealed",
          bacWaterMl: v.bacWaterMl ?? null,
          concentrationMcgPerMl: v.concentrationMcgPerMl ?? null,
          expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
          reconstitutedAt: v.reconstitutedAt
            ? new Date(v.reconstitutedAt)
            : null,
          price: v.price ?? null,
          label: v.label ?? null,
        },
      }),
    );
  }

  // stock
  for (const s of data.stock ?? []) {
    const pid = resolve(s.peptide);
    if (!pid) {
      unresolved.push(`stock:${s.peptide}`);
      console.log(`SKIP stock      | unresolved peptide "${s.peptide}"`);
      continue;
    }
    console.log(
      `INSERT stock    | ${s.peptide} vialMcg:${s.vialMcg} qty:${s.quantity ?? 1}`,
    );
    ops.push(() =>
      prisma.stockItem.create({
        data: {
          userId: user.id,
          peptideId: pid,
          vialMcg: s.vialMcg,
          quantity: s.quantity ?? 1,
          dose: s.dose ?? null,
          doseUnit: s.doseUnit ?? "mcg",
          frequency: s.frequency ?? "daily",
          price: s.price ?? null,
          notes: s.notes ?? null,
        },
      }),
    );
  }

  // cycles (dup guard: name + startDate)
  for (const c of data.cycles ?? []) {
    const startDate = new Date(c.startDate);
    const pid = c.peptide ? resolve(c.peptide) : null;
    if (c.peptide && !pid) {
      unresolved.push(`cycle:${c.peptide}`);
    }
    const dup = await prisma.cycle.findFirst({
      where: { userId: user.id, name: c.name, startDate },
    });
    if (dup) {
      console.log(`SKIP cycle (dup)| ${c.name} @ ${c.startDate}`);
      continue;
    }
    console.log(
      `INSERT cycle    | ${c.name} start:${c.startDate} peptide:${c.peptide ?? "-"}`,
    );
    ops.push(() =>
      prisma.cycle.create({
        data: {
          userId: user.id,
          name: c.name,
          startDate,
          endDate: c.endDate ? new Date(c.endDate) : null,
          status: c.status ?? "planned",
          peptideId: pid,
          notes: c.notes ?? null,
          washoutDays: c.washoutDays ?? null,
          scheduleConfig: c.scheduleConfig ?? undefined,
        },
      }),
    );
  }

  // doses (dup guard: peptideId + exact takenAt)
  for (const d of data.doses ?? []) {
    const pid = resolve(d.peptide);
    if (!pid) {
      unresolved.push(`dose:${d.peptide}`);
      console.log(`SKIP dose       | unresolved peptide "${d.peptide}"`);
      continue;
    }
    const takenAt = d.takenAt ? new Date(d.takenAt) : new Date();
    const dup = await prisma.doseLog.findFirst({
      where: { userId: user.id, peptideId: pid, takenAt },
    });
    if (dup) {
      console.log(`SKIP dose (dup) | ${d.peptide} @ ${takenAt.toISOString()}`);
      continue;
    }
    console.log(
      `INSERT dose     | ${d.peptide} ${d.amount}${d.unit ?? "mcg"} @ ${takenAt.toISOString()}`,
    );
    ops.push(() =>
      prisma.doseLog.create({
        data: {
          userId: user.id,
          peptideId: pid,
          amount: d.amount,
          unit: d.unit ?? "mcg",
          takenAt,
          route: d.route ?? null,
          site: d.site ?? null,
          mood: d.mood ?? null,
          energy: d.energy ?? null,
          notes: d.notes ?? null,
        },
      }),
    );
  }

  // supplements (dup guard: name + day of startDate)
  for (const s of data.supplements ?? []) {
    const startDate = s.startDate ? new Date(s.startDate) : new Date();
    const { gte, lt, day } = dayBounds(startDate);
    const dup = await prisma.supplement.findFirst({
      where: { userId: user.id, name: s.name, startDate: { gte, lt } },
    });
    if (dup) {
      console.log(`SKIP supp (dup) | ${s.name} @ ${day}`);
      continue;
    }
    console.log(
      `INSERT supp     | ${String(s.name).padEnd(24)} | ${s.dose ?? "-"} | ${s.category ?? "other"} | ${s.status ?? "active"} | start ${day}${s.endDate ? ` end ${new Date(s.endDate).toISOString().slice(0, 10)}` : ""}`,
    );
    ops.push(() =>
      prisma.supplement.create({
        data: {
          userId: user.id,
          name: s.name,
          category: s.category ?? "other",
          dose: s.dose ?? null,
          frequency: s.frequency ?? "daily",
          timesPerDay: s.timesPerDay ?? 1,
          timing: s.timing ?? null,
          startDate,
          endDate: s.endDate ? new Date(s.endDate) : null,
          status: s.status ?? "active",
          notes: s.notes ?? null,
        },
      }),
    );
  }

  // lab reminders (dup guard: label + day of dueAt)
  for (const r of data.labReminders ?? []) {
    const dueAt = new Date(r.dueAt);
    const { gte, lt, day } = dayBounds(dueAt);
    const dup = await prisma.labReminder.findFirst({
      where: { userId: user.id, label: r.label, dueAt: { gte, lt } },
    });
    if (dup) {
      console.log(`SKIP remind(dup)| ${r.label} @ ${day}`);
      continue;
    }
    console.log(
      `INSERT reminder | ${String(r.label).padEnd(40)} | due ${day} | slug:${r.biomarkerSlug ?? "-"}`,
    );
    ops.push(() =>
      prisma.labReminder.create({
        data: {
          userId: user.id,
          label: r.label,
          dueAt,
          biomarkerSlug: r.biomarkerSlug ?? null,
          note: r.note ?? null,
        },
      }),
    );
  }

  // conditions (dup guard: name, case-insensitive)
  for (const c of data.conditions ?? []) {
    const dup = await prisma.condition.findFirst({
      where: {
        userId: user.id,
        name: { equals: c.name, mode: "insensitive" },
      },
    });
    if (dup) {
      console.log(`SKIP cond (dup) | ${c.name}`);
      continue;
    }
    const biomarkerSlugs = Array.isArray(c.biomarkerSlugs)
      ? c.biomarkerSlugs
      : null;
    const relatedPeptides = Array.isArray(c.relatedPeptides)
      ? c.relatedPeptides
      : null;
    console.log(
      `INSERT cond     | ${String(c.name).padEnd(34)} | ${c.status ?? "active"} | ${c.code ?? "-"} | links:${(biomarkerSlugs ?? []).join(",") || "-"}`,
    );
    ops.push(() =>
      prisma.condition.create({
        data: {
          userId: user.id,
          name: c.name,
          code: c.code ?? null,
          status: c.status ?? "active",
          system: c.system ?? null,
          onsetDate: c.onsetDate ? new Date(c.onsetDate) : null,
          notes: c.notes ?? null,
          biomarkerSlugs: biomarkerSlugs ?? undefined,
          relatedPeptides: relatedPeptides ?? undefined,
        },
      }),
    );
  }

  // family history (dup guard: relative + condition, case-insensitive)
  for (const f of data.familyHistory ?? []) {
    const dup = await prisma.familyHistoryEntry.findFirst({
      where: {
        userId: user.id,
        relative: f.relative,
        condition: { equals: f.condition, mode: "insensitive" },
      },
    });
    if (dup) {
      console.log(`SKIP fam (dup)  | ${f.relative}: ${f.condition}`);
      continue;
    }
    console.log(
      `INSERT family   | ${String(f.relative).padEnd(12)} | ${f.condition}`,
    );
    ops.push(() =>
      prisma.familyHistoryEntry.create({
        data: {
          userId: user.id,
          relative: f.relative,
          condition: f.condition,
          notes: f.notes ?? null,
        },
      }),
    );
  }

  console.log(
    `\nPlanned writes: ${ops.length}${unresolved.length ? ` · unresolved peptides: ${unresolved.join(", ")}` : ""}`,
  );
  if (!apply) {
    console.log("\n(dry-run only — nothing written. Re-run with --apply.)");
    return;
  }

  // Run all queued ops in one transaction (findFirst dup-checks already ran above).
  await prisma.$transaction(
    ops.map((op) => op()) as Prisma.PrismaPromise<unknown>[],
  );
  console.log(`\n✅ Applied ${ops.length} writes.`);
}

// ── full markdown export of a profile (read-only) ──────────────────────────
function md(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v).replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}
function iso(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString() : "—";
}
function day(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "—";
}
function strArr(j: unknown): string[] {
  return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
}
function bullets(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_(none)_";
}
function flag(value: number, lo?: number | null, hi?: number | null): string {
  if (lo != null && value < lo) return "LOW";
  if (hi != null && value > hi) return "HIGH";
  if (lo != null || hi != null) return "in range";
  return "—";
}

async function report(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account: true },
  });
  if (!user) throw new Error(`No profile with id ${userId}`);

  const [
    cycles,
    doses,
    vials,
    stock,
    labs,
    measurements,
    supplements,
    supplementLogs,
    checkIns,
    reminders,
    foodItems,
    foodLogs,
    fasting,
    photos,
    pushCount,
  ] = await Promise.all([
    prisma.cycle.findMany({ where: { userId }, orderBy: { startDate: "asc" } }),
    prisma.doseLog.findMany({
      where: { userId },
      orderBy: [{ takenAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.vial.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.stockItem.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.labResult.findMany({
      where: { userId },
      orderBy: [{ takenAt: "asc" }, { marker: "asc" }],
    }),
    prisma.measurement.findMany({
      where: { userId },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.supplement.findMany({
      where: { userId },
      orderBy: { startDate: "asc" },
    }),
    prisma.supplementLog.findMany({
      where: { userId },
      orderBy: { takenAt: "asc" },
    }),
    prisma.checkIn.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.labReminder.findMany({
      where: { userId },
      orderBy: { dueAt: "asc" },
    }),
    prisma.foodItem.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.foodLog.findMany({
      where: { userId },
      orderBy: [{ date: "asc" }, { loggedAt: "asc" }],
    }),
    prisma.fastingSession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
    }),
    prisma.photo.findMany({ where: { userId }, orderBy: { takenAt: "asc" } }),
    prisma.pushSubscription.count({ where: { userId } }),
  ]);

  // Resolve peptide + stack names.
  const pids = new Set<string>();
  for (const c of cycles) if (c.peptideId) pids.add(c.peptideId);
  for (const d of doses) pids.add(d.peptideId);
  for (const v of vials) pids.add(v.peptideId);
  for (const s of stock) pids.add(s.peptideId);
  const peptides = await prisma.peptide.findMany({
    where: { id: { in: [...pids] } },
  });
  const pById = new Map(peptides.map((p) => [p.id, p]));
  const pName = (id: string | null) =>
    id ? (pById.get(id)?.name ?? `(unknown ${id})`) : "—";
  const stackIds = cycles.map((c) => c.stackId).filter((x): x is string => !!x);
  const stacks = stackIds.length
    ? await prisma.stack.findMany({ where: { id: { in: stackIds } } })
    : [];
  const sById = new Map(stacks.map((s) => [s.id, s]));

  const now = new Date();
  const age = user.birthYear ? now.getUTCFullYear() - user.birthYear : null;
  const L: string[] = [];
  const P = (s = "") => L.push(s);

  P(`# Peptra — Full Profile Export`);
  P();
  P(
    `> **Educational information about research compounds — NOT medical advice.** This is a raw data export of a personal peptide/health tracker for a user who will provide clinical history separately for analysis.`,
  );
  P();
  P(`- **Generated:** ${now.toISOString()}`);
  P(`- **Profile:** ${md(user.name)} (User.id \`${user.id}\`)`);
  P(`- **Account:** ${md(user.account?.email)}`);
  P();
  P(`## 1. Profile settings`);
  P();
  P(`| Field | Value |`);
  P(`| --- | --- |`);
  P(`| Name | ${md(user.name)} |`);
  P(`| Sex | ${md(user.sex)} |`);
  P(
    `| Birth year | ${md(user.birthYear)}${age != null ? ` (age ~${age})` : ""} |`,
  );
  P(`| Height (cm) | ${md(user.heightCm)} |`);
  P(`| Timezone | ${md(user.timezone)} |`);
  P(`| Weight unit | ${md(user.weightUnit)} |`);
  P(`| Dose unit | ${md(user.doseUnit)} |`);
  P(`| Theme | ${md(user.theme)} |`);
  P(`| Calorie goal | ${md(user.calorieGoal)} |`);
  P(`| Protein goal (g) | ${md(user.proteinGoal)} |`);
  P(`| Carb goal (g) | ${md(user.carbGoal)} |`);
  P(`| Fat goal (g) | ${md(user.fatGoal)} |`);
  P(`| Fiber goal (g) | ${md(user.fiberGoal)} |`);
  P(`| Sodium goal (mg) | ${md(user.sodiumGoal)} |`);
  P(`| Water goal (mL) | ${md(user.waterGoal)} |`);
  P(`| Created | ${iso(user.createdAt)} |`);
  P();

  // ── 2. Lab results (grouped by date) ──
  P(`## 2. Lab results / analytics (${labs.length})`);
  P();
  P(
    `_All values as stored. Reference ranges are snapshotted at entry. Flag is computed vs. those ranges._`,
  );
  P();
  const byDate = new Map<string, typeof labs>();
  for (const l of labs) {
    const k = day(l.takenAt);
    if (!byDate.has(k)) byDate.set(k, [] as unknown as typeof labs);
    byDate.get(k)!.push(l);
  }
  for (const [d, rows] of [...byDate.entries()].sort((a, b) =>
    a[0] < b[0] ? 1 : -1,
  )) {
    P(`### ${d} (${rows.length} markers)`);
    P();
    P(
      `| Marker | Value | Unit | Ref low | Ref high | Flag | Biomarker slug | Notes |`,
    );
    P(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
    for (const l of rows) {
      P(
        `| ${md(l.marker)} | ${md(l.value)} | ${md(l.unit)} | ${md(l.refLow)} | ${md(l.refHigh)} | ${flag(l.value, l.refLow, l.refHigh)} | ${md(l.biomarkerSlug)} | ${md(l.notes)} |`,
      );
    }
    P();
  }

  // ── 3. Cycles ──
  P(`## 3. Cycles (${cycles.length})`);
  P();
  for (const c of cycles) {
    P(`### ${md(c.name)}`);
    P(`- **Status:** ${md(c.status)}`);
    P(`- **Peptide:** ${c.peptideId ? pName(c.peptideId) : "—"}`);
    P(`- **Stack:** ${c.stackId ? md(sById.get(c.stackId)?.name) : "—"}`);
    P(`- **Start:** ${day(c.startDate)} · **End:** ${day(c.endDate)}`);
    P(`- **Washout days:** ${md(c.washoutDays)}`);
    P(`- **Notes:** ${md(c.notes)}`);
    P(
      `- **scheduleConfig:** \`${c.scheduleConfig ? JSON.stringify(c.scheduleConfig) : "—"}\``,
    );
    P();
  }

  // ── 4. Dose logs ──
  P(`## 4. Dose logs (${doses.length})`);
  P();
  P(
    `| Taken at (UTC) | Peptide | Amount | Unit | Route | Site | Mood | Energy | Side effects | Notes |`,
  );
  P(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const d of doses) {
    P(
      `| ${iso(d.takenAt)} | ${md(pName(d.peptideId))} | ${md(d.amount)} | ${md(d.unit)} | ${md(d.route)} | ${md(d.site)} | ${md(d.mood)} | ${md(d.energy)} | ${md(strArr(d.sideEffects).join(", "))} | ${md(d.notes)} |`,
    );
  }
  P();

  // ── 5. Inventory: vials ──
  P(`## 5. Inventory — active vials (${vials.length})`);
  P();
  P(
    `| Peptide | Label | Total mcg | Remaining mcg | BAC water mL | mcg/mL | Status | Reconstituted | Expires | Price | Notes |`,
  );
  P(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const v of vials) {
    P(
      `| ${md(pName(v.peptideId))} | ${md(v.label)} | ${md(v.totalMcg)} | ${md(v.remainingMcg)} | ${md(v.bacWaterMl)} | ${md(v.concentrationMcgPerMl)} | ${md(v.status)} | ${day(v.reconstitutedAt)} | ${day(v.expiresAt)} | ${md(v.price)} | ${md(v.notes)} |`,
    );
  }
  P();

  // ── 6. Inventory: stock ──
  P(`## 6. Inventory — stock reserve (${stock.length})`);
  P();
  P(
    `| Peptide | Vial mcg | Quantity | Planned dose | Dose unit | Frequency | Price | Notes |`,
  );
  P(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of stock) {
    P(
      `| ${md(pName(s.peptideId))} | ${md(s.vialMcg)} | ${md(s.quantity)} | ${md(s.dose)} | ${md(s.doseUnit)} | ${md(s.frequency)} | ${md(s.price)} | ${md(s.notes)} |`,
    );
  }
  P();

  // ── 7. Measurements ──
  P(`## 7. Measurements (${measurements.length})`);
  P();
  P(`| Recorded (UTC) | Type | Label | Value | Unit |`);
  P(`| --- | --- | --- | --- | --- |`);
  for (const m of measurements) {
    P(
      `| ${iso(m.recordedAt)} | ${md(m.type)} | ${md(m.label)} | ${md(m.value)} | ${md(m.unit)} |`,
    );
  }
  P();

  // ── 8. Supplements ──
  P(
    `## 8. Supplements (${supplements.length}) · logs: ${supplementLogs.length}`,
  );
  P();
  P(
    `| Name | Category | Dose | Frequency | Times/day | Timing | Start | End | Status | Notes |`,
  );
  P(`| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`);
  for (const s of supplements) {
    P(
      `| ${md(s.name)} | ${md(s.category)} | ${md(s.dose)} | ${md(s.frequency)} | ${md(s.timesPerDay)} | ${md(s.timing)} | ${day(s.startDate)} | ${day(s.endDate)} | ${md(s.status)} | ${md(s.notes)} |`,
    );
  }
  P();

  // ── 9. Check-ins ──
  P(`## 9. Daily check-ins (${checkIns.length})`);
  P();
  P(`| Date | Ratings (1-5) | Side effects | Notes |`);
  P(`| --- | --- | --- | --- |`);
  for (const c of checkIns) {
    P(
      `| ${day(c.date)} | ${md(JSON.stringify(c.ratings))} | ${md(strArr(c.sideEffects).join(", "))} | ${md(c.notes)} |`,
    );
  }
  P();

  // ── 10. Lab reminders ──
  P(`## 10. Lab-recheck reminders (${reminders.length})`);
  P();
  P(`| Due | Label | Biomarker slug | Completed | Note |`);
  P(`| --- | --- | --- | --- | --- |`);
  for (const r of reminders) {
    P(
      `| ${day(r.dueAt)} | ${md(r.label)} | ${md(r.biomarkerSlug)} | ${iso(r.completedAt)} | ${md(r.note)} |`,
    );
  }
  P();

  // ── 11. Food ──
  P(`## 11. Food — library items (${foodItems.length})`);
  P();
  P(
    `| Name | Brand | Serving | Cal | Protein | Carbs | Fat | Fiber | Sugar | SatFat | Sodium | Recipe? | Source |`,
  );
  P(
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  );
  for (const f of foodItems) {
    P(
      `| ${md(f.name)} | ${md(f.brand)} | ${md(f.servingSize)} ${md(f.servingUnit)} | ${md(f.calories)} | ${md(f.protein)} | ${md(f.carbs)} | ${md(f.fat)} | ${md(f.fiber)} | ${md(f.sugar)} | ${md(f.saturatedFat)} | ${md(f.sodium)} | ${f.ingredients ? "yes" : "no"} | ${md(f.source)} |`,
    );
  }
  P();
  P(`### Food logs (${foodLogs.length})`);
  P();
  P(
    `| Date | Meal | Name | Qty | Cal | Protein | Carbs | Fat | Fiber | Sugar | SatFat | Sodium | Notes |`,
  );
  P(
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  );
  for (const f of foodLogs) {
    P(
      `| ${day(f.date)} | ${md(f.mealType)} | ${md(f.name)} | ${md(f.quantity)} | ${md(f.calories)} | ${md(f.protein)} | ${md(f.carbs)} | ${md(f.fat)} | ${md(f.fiber)} | ${md(f.sugar)} | ${md(f.saturatedFat)} | ${md(f.sodium)} | ${md(f.notes)} |`,
    );
  }
  P();

  // ── 12. Fasting ──
  P(`## 12. Fasting sessions (${fasting.length})`);
  P();
  P(`| Started (UTC) | Ended (UTC) | Target hours |`);
  P(`| --- | --- | --- |`);
  for (const f of fasting) {
    P(`| ${iso(f.startedAt)} | ${iso(f.endedAt)} | ${md(f.targetHours)} |`);
  }
  P();

  // ── 13. Photos ──
  P(`## 13. Progress photos (${photos.length})`);
  P();
  P(`_Blob pathnames omitted from analysis; metadata only._`);
  P();
  P(`| Taken (UTC) | Caption | Tags |`);
  P(`| --- | --- | --- |`);
  for (const ph of photos) {
    P(
      `| ${iso(ph.takenAt)} | ${md(ph.caption)} | ${md(strArr(ph.tags).join(", "))} |`,
    );
  }
  P();
  P(
    `_Push subscriptions on file: ${pushCount} (device tokens, not clinically relevant)._`,
  );
  P();

  // ── 14. Peptide reference (compounds this profile uses) ──
  P(
    `## 14. Peptide reference — compounds in this profile (${peptides.length})`,
  );
  P();
  P(
    `_Educational library data for the compounds referenced above (cycles/doses/inventory)._`,
  );
  P();
  for (const p of peptides.sort((a, b) => a.name.localeCompare(b.name))) {
    const dosage = p.dosage as Record<string, unknown> | null;
    const recon = p.reconstitution as Record<string, unknown> | null;
    P(`### ${md(p.name)} (\`${p.slug}\`)`);
    P(
      `- **Category:** ${md(p.category)} · **Route:** ${md(p.route)} · **Frequency:** ${md(p.frequency)}`,
    );
    P(
      `- **Half-life:** ${md(p.halfLife)}${p.halfLifeHours != null ? ` (${p.halfLifeHours} h)` : ""} · **Cycle length:** ${md(p.cycleLength)}`,
    );
    P(`- **Summary:** ${md(p.summary)}`);
    P(`- **Mechanism:** ${md(p.mechanism)}`);
    P(`- **Dosage:** \`${dosage ? JSON.stringify(dosage) : "—"}\``);
    P(`- **Reconstitution:** \`${recon ? JSON.stringify(recon) : "—"}\``);
    P(`- **Storage:** ${md(p.storage)}`);
    P(`- **Benefits:**`);
    P(bullets(strArr(p.benefits)));
    P(`- **Risks:**`);
    P(bullets(strArr(p.risks)));
    P(`- **Side effects:**`);
    P(bullets(strArr(p.sideEffects)));
    P(`- **Contraindications:**`);
    P(bullets(strArr(p.contraindications)));
    P(`- **Tags:** ${md(strArr(p.tags).join(", "))}`);
    P();
  }

  P(`---`);
  P(
    `_End of export. All data read directly from the database for profile \`${user.id}\`; nothing inferred or assumed._`,
  );

  mkdirSync("imports", { recursive: true });
  const path = `imports/profile-report-${day(now)}.md`;
  writeFileSync(path, L.join("\n"));
  console.log(`✅ Report written: ${path}`);
  console.log(
    `   sections: profile, ${labs.length} labs, ${cycles.length} cycles, ${doses.length} doses, ${vials.length} vials, ${stock.length} stock, ${measurements.length} meas, ${supplements.length} supps, ${checkIns.length} check-ins, ${foodItems.length} food items, ${foodLogs.length} food logs, ${peptides.length} peptides`,
  );
}

// ── list a profile's labs (read-only verification) ─────────────────────────
async function listLabs(userId: string) {
  const labs = await prisma.labResult.findMany({
    where: { userId },
    orderBy: [{ takenAt: "desc" }, { marker: "asc" }],
  });
  console.log(`\nLabs for user ${userId}: ${labs.length}\n`);
  for (const l of labs) {
    console.log(
      `${l.takenAt.toISOString().slice(0, 10)} | ${l.marker.padEnd(34)} | ${String(l.value).padStart(8)} ${l.unit ?? ""} | slug:${l.biomarkerSlug ?? "-"}`,
    );
  }
}

// ── relink a slug-less lab marker to a catalog biomarker slug ───────────────
async function relinkLab(
  userId: string,
  marker: string,
  slug: string,
  apply: boolean,
) {
  const target = await prisma.labResult.findMany({
    where: { userId, marker, biomarkerSlug: null },
    select: { id: true, takenAt: true, value: true, unit: true },
  });
  console.log(
    `\n${apply ? "APPLY" : "DRY-RUN"} relink "${marker}" → slug:${slug} for user ${userId}`,
  );
  console.log(`Matching slug-less rows: ${target.length}`);
  for (const t of target) {
    console.log(
      `  ${t.takenAt.toISOString().slice(0, 10)} | ${t.value} ${t.unit ?? ""}`,
    );
  }
  if (!apply) {
    console.log("\n(dry-run only — nothing written. Add --apply to write.)");
    return;
  }
  const res = await prisma.labResult.updateMany({
    where: { userId, marker, biomarkerSlug: null },
    data: { biomarkerSlug: slug },
  });
  console.log(`\n✅ Relinked ${res.count} row(s).`);
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => a.startsWith("--"))?.replace("--", "");
  const val = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  switch (mode) {
    case "inspect":
      await inspect(val("--email"));
      break;
    case "backup": {
      const u = val("--user");
      if (!u) throw new Error("--backup requires --user <userId>");
      await backup(u);
      break;
    }
    case "dry-run": {
      const f = val("--file");
      if (!f) throw new Error("--dry-run requires --file <import.json>");
      await runImport(f, false);
      break;
    }
    case "apply": {
      const f = val("--file");
      if (!f) throw new Error("--apply requires --file <import.json>");
      await runImport(f, true);
      break;
    }
    case "labs": {
      const u = val("--user");
      if (!u) throw new Error("--labs requires --user <userId>");
      await listLabs(u);
      break;
    }
    case "report": {
      const u = val("--user");
      if (!u) throw new Error("--report requires --user <userId>");
      await report(u);
      break;
    }
    case "relink": {
      const u = val("--user");
      const marker = val("--marker");
      const slug = val("--slug");
      if (!u || !marker || !slug)
        throw new Error(
          "--relink requires --user <id> --marker <name> --slug <slug> [--apply-write]",
        );
      await relinkLab(u, marker, slug, args.includes("--apply-write"));
      break;
    }
    default:
      console.log(
        "Usage: tsx scripts/import-profile.ts --inspect [--email x] | --backup --user x | --dry-run --file f | --apply --file f",
      );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
