/**
 * Heuristic parser for lab-report text (extracted from a PDF or pasted). Turns
 * free-form report text into candidate lab rows the user then REVIEWS and edits
 * before anything is written — the parser is intentionally best-effort, never
 * authoritative. Pure + unit-tested (see lab-import.test.ts).
 *
 * Handles Spanish/Colombian report conventions (SURA/EPS): decimal comma or dot,
 * "70 - 100" / "< 200" / "> 40" reference ranges, and dd/mm/yyyy dates.
 */

export interface ParsedLabRow {
  /** Best-guess marker name (leading text of the line). */
  marker: string;
  /** Parsed numeric value. */
  value: number;
  /** Best-guess unit, or null. */
  unit: string | null;
  /** Parsed reference low bound, or null. */
  refLow: number | null;
  /** Parsed reference high bound, or null. */
  refHigh: number | null;
  /** The original source line (for the review UI). */
  raw: string;
}

export interface ParsedLabReport {
  rows: ParsedLabRow[];
  /** ISO yyyy-mm-dd if a collection date was found, else null. */
  date: string | null;
}

/** Robust numeric parse: strip spaces, treat a comma as the decimal separator. */
function toNumber(s: string): number {
  const cleaned = s.trim().replace(",", ".");
  return Number(cleaned);
}

// A numeric token: optional sign, digits, optional decimal (dot or comma).
const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`;

// Lines that are clearly not results (headers, footers, metadata).
const SKIP_PATTERNS = [
  /^p[áa]gina\b/i,
  /^fecha\b/i,
  /^paciente\b/i,
  /^documento\b/i,
  /^m[ée]dico\b/i,
  /^laboratorio\b/i,
  /^resultado\b/i,
  /^valor(es)?\s+de\s+referencia/i,
  /^informe\b/i,
  /^muestra\b/i,
  /^orden\b/i,
];

const RANGE_RE = new RegExp(
  String.raw`(?:(?<lt>[<≤]\s*(?<hi1>${NUM}))|(?<gt>[>≥]\s*(?<lo1>${NUM}))|(?<lo2>${NUM})\s*(?:-|–|a|to)\s*(?<hi2>${NUM}))`,
);

const UNIT_RE =
  /^(?:mg\/dl|g\/dl|mg\/l|g\/l|ng\/ml|pg\/ml|µg\/dl|ug\/dl|mcg\/dl|µiu\/ml|uiu\/ml|miu\/l|mui\/ml|iu\/l|ui\/l|u\/l|mmol\/l|µmol\/l|umol\/l|meq\/l|ng\/dl|nmol\/l|pmol\/l|mm\/h|mm3|mil\/mm3|x10\^?\d+|10\^\d+\/l|células\/µl|cel\/µl|%|fl|pg)$/i;

/**
 * Parse a single line into a candidate row, or null if it doesn't look like a
 * numeric result. Strategy: name = text before the first number; value = first
 * number; then optionally a unit token and a reference range.
 */
export function parseLabLine(line: string): ParsedLabRow | null {
  const raw = line.trim();
  if (raw.length < 3) return null;
  if (SKIP_PATTERNS.some((re) => re.test(raw))) return null;

  const firstNum = new RegExp(NUM).exec(raw);
  if (!firstNum || firstNum.index === 0) return null;

  const name = raw
    .slice(0, firstNum.index)
    .replace(/[.:·\-\s]+$/, "")
    .trim();
  // A real marker name has letters and isn't trivially short.
  if (name.length < 2 || !/[a-zA-ZÀ-ÿ]/.test(name)) return null;

  const value = toNumber(firstNum[0]);
  if (Number.isNaN(value)) return null;

  const rest = raw.slice(firstNum.index + firstNum[0].length).trim();

  // Unit: the first whitespace-delimited token, if it looks like a unit.
  let unit: string | null = null;
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length && UNIT_RE.test(tokens[0])) {
    unit = tokens[0];
  }

  // Reference range anywhere in the remainder.
  let refLow: number | null = null;
  let refHigh: number | null = null;
  const rangeMatch = RANGE_RE.exec(rest);
  if (rangeMatch?.groups) {
    const g = rangeMatch.groups;
    if (g.hi1 != null) {
      refHigh = toNumber(g.hi1);
    } else if (g.lo1 != null) {
      refLow = toNumber(g.lo1);
    } else if (g.lo2 != null && g.hi2 != null) {
      refLow = toNumber(g.lo2);
      refHigh = toNumber(g.hi2);
    }
  }

  return { marker: name, value, unit, refLow, refHigh, raw };
}

/**
 * Find a collection date in the report text. Accepts dd/mm/yyyy, dd-mm-yyyy,
 * yyyy-mm-dd (preferring one labeled "Fecha"). Returns ISO yyyy-mm-dd or null.
 */
export function parseReportDate(text: string): string | null {
  // Prefer a date on a "Fecha" line.
  const labeled = /fecha[^0-9]{0,20}(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/i.exec(
    text,
  );
  const generic = /(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/.exec(text);
  const token = (labeled?.[1] ?? generic?.[1]) || null;
  if (!token) return null;

  const parts = token.split(/[/-]/).map((p) => p.trim());
  if (parts.length !== 3) return null;

  let year: number, month: number, day: number;
  if (parts[0].length === 4) {
    // yyyy-mm-dd
    [year, month, day] = [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  } else {
    // dd/mm/yyyy (Colombian convention)
    [day, month, year] = [Number(parts[0]), Number(parts[1]), Number(parts[2])];
    if (year < 100) year += 2000;
  }
  if (
    !year ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > 2200
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Parse a whole report's text into rows + a best-guess date. */
export function parseLabReport(text: string): ParsedLabReport {
  const rows: ParsedLabRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const row = parseLabLine(line);
    if (row) rows.push(row);
  }
  return { rows, date: parseReportDate(text) };
}
