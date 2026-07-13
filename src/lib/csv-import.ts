/**
 * Wearable / measurement CSV parsing (pure, unit-tested). Turns pasted CSV text
 * into normalized measurement rows plus a **skip report** so the importer can
 * tell the user exactly what was dropped and why — instead of silently
 * discarding rows (the previous behavior). Handles header aliases, common
 * wearable type names, robust (non-locale-ambiguous) dates, and in-file dedup.
 */

import { parseLocalDate } from "@/lib/dates";

/** Canonical measurement types the app stores + charts. */
export const CANONICAL_MEASUREMENT_TYPES = [
  "weight",
  "bodyFat",
  "sleep",
  "recovery",
  "restingHr",
  "hrv",
  "steps",
  "workout",
  "custom",
] as const;
export type MeasurementType = (typeof CANONICAL_MEASUREMENT_TYPES)[number];

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

/** Alias (normalized) → canonical type. Covers common wearable export labels. */
const TYPE_ALIASES: Record<string, MeasurementType> = {
  weight: "weight",
  bodyweight: "weight",
  bodyfat: "bodyFat",
  bodyfatpercent: "bodyFat",
  bodyfatpercentage: "bodyFat",
  sleep: "sleep",
  sleephours: "sleep",
  sleepduration: "sleep",
  recovery: "recovery",
  readiness: "recovery",
  restinghr: "restingHr",
  restingheartrate: "restingHr",
  rhr: "restingHr",
  restingpulse: "restingHr",
  hrv: "hrv",
  heartratevariability: "hrv",
  steps: "steps",
  stepcount: "steps",
  workout: "workout",
  exercise: "workout",
  activity: "workout",
  custom: "custom",
};

/** Header aliases → the canonical column we need. */
const HEADER_ALIASES: Record<string, "date" | "type" | "value" | "unit"> = {
  date: "date",
  timestamp: "date",
  datetime: "date",
  recordedat: "date",
  time: "date",
  day: "date",
  type: "type",
  metric: "type",
  measurement: "type",
  kind: "type",
  value: "value",
  val: "value",
  amount: "value",
  reading: "value",
  unit: "unit",
  units: "unit",
};

/** Split one CSV line into cells, honoring double-quoted fields ("" = escaped). */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/** Resolve a raw type label to a canonical type, or null if unknown. */
export function canonicalType(raw: string): MeasurementType | null {
  return TYPE_ALIASES[norm(raw)] ?? null;
}

/**
 * Parse a date cell **without locale ambiguity**. Accepts ISO date/datetime
 * (`YYYY-MM-DD`, `YYYY-MM-DDThh:mm[:ss][Z|±hh:mm]`, `/` also allowed as the date
 * separator) and epoch seconds/millis. Anything else (e.g. `01/02/2026`, which
 * could be Jan-2 or Feb-1) is rejected rather than silently mis-parsed.
 * Date-only values resolve to LOCAL midnight (consistent with the rest of the app).
 */
export function parseCsvDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{13}$/.test(s)) return new Date(Number(s));
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);

  const iso = s.replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return parseLocalDate(iso);
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(iso)) {
    const dt = new Date(iso.replace(" ", "T"));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

export interface ParsedMeasurementRow {
  type: MeasurementType;
  value: number;
  unit: string | null;
  recordedAt: Date;
}

export interface SkipReason {
  reason: string;
  count: number;
}

export interface CsvParseResult {
  rows: ParsedMeasurementRow[];
  /** Number of data rows (excluding the header). */
  totalDataRows: number;
  /** Rows dropped, grouped by reason (missing field, unknown type, …). */
  skipped: SkipReason[];
  /** In-file duplicate rows (same type + timestamp + value) collapsed away. */
  duplicatesInFile: number;
}

/**
 * Parse measurement CSV text into normalized rows + a skip report. Throws only
 * on structural problems (no header/rows, missing required columns); individual
 * bad rows are counted in `skipped`, never fatal.
 */
export function parseMeasurementsCsv(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const header = parseCsvLine(lines[0]).map((h) => norm(h.trim()));
  const col: Record<"date" | "type" | "value" | "unit", number> = {
    date: -1,
    type: -1,
    value: -1,
    unit: -1,
  };
  header.forEach((h, i) => {
    const canon = HEADER_ALIASES[h];
    if (canon && col[canon] === -1) col[canon] = i;
  });
  if (col.date === -1 || col.type === -1 || col.value === -1) {
    throw new Error(
      "CSV header must include date, type, and value columns (unit optional).",
    );
  }

  const skips = new Map<string, number>();
  const bump = (reason: string) =>
    skips.set(reason, (skips.get(reason) ?? 0) + 1);

  const seen = new Set<string>();
  const rows: ParsedMeasurementRow[] = [];
  let duplicatesInFile = 0;
  const dataLines = lines.slice(1);

  for (const line of dataLines) {
    const cells = parseCsvLine(line);
    const rawDate = cells[col.date]?.trim() ?? "";
    const rawType = cells[col.type]?.trim() ?? "";
    const rawValue = cells[col.value]?.trim() ?? "";
    const unit = col.unit !== -1 ? cells[col.unit]?.trim() || null : null;

    if (!rawDate || !rawType || !rawValue) {
      bump("missing a required field");
      continue;
    }
    const type = canonicalType(rawType);
    if (!type) {
      bump("unrecognized type");
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      bump("non-numeric value");
      continue;
    }
    const recordedAt = parseCsvDate(rawDate);
    if (!recordedAt) {
      bump("unrecognized date (use YYYY-MM-DD)");
      continue;
    }

    const key = `${type}|${recordedAt.getTime()}|${value}`;
    if (seen.has(key)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(key);
    rows.push({ type, value, unit, recordedAt });
  }

  const skipped = Array.from(skips.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return { rows, totalDataRows: dataLines.length, skipped, duplicatesInFile };
}
