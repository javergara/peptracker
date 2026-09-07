import { describe, expect, it } from "vitest";

import {
  currentDose,
  currentDoseChange,
  sortDoseChanges,
  type DoseChangeLike,
} from "./medications";

const d = (iso: string) => new Date(iso);

const CHANGES: DoseChangeLike[] = [
  { dose: "40 mg", effectiveAt: d("2026-01-13T00:00:00Z") },
  { dose: "20 mg", effectiveAt: d("2026-07-07T00:00:00Z"), reason: "↑ALT/AST" },
];

describe("sortDoseChanges", () => {
  it("orders newest-first without mutating the input", () => {
    const input = [...CHANGES];
    const sorted = sortDoseChanges(input);
    expect(sorted.map((c) => c.dose)).toEqual(["20 mg", "40 mg"]);
    expect(input.map((c) => c.dose)).toEqual(["40 mg", "20 mg"]);
  });

  it("returns an empty array for no changes", () => {
    expect(sortDoseChanges([])).toEqual([]);
  });
});

describe("currentDoseChange / currentDose", () => {
  it("returns the most recent change on or before the as-of date", () => {
    expect(currentDose(CHANGES, d("2026-03-01T00:00:00Z"))).toBe("40 mg");
    expect(currentDose(CHANGES, d("2026-08-01T00:00:00Z"))).toBe("20 mg");
  });

  it("includes a change effective exactly at the as-of instant", () => {
    expect(currentDose(CHANGES, d("2026-07-07T00:00:00Z"))).toBe("20 mg");
  });

  it("returns null when all changes are in the future", () => {
    expect(currentDoseChange(CHANGES, d("2025-01-01T00:00:00Z"))).toBeNull();
    expect(currentDose(CHANGES, d("2025-01-01T00:00:00Z"))).toBeNull();
  });

  it("returns null for no changes", () => {
    expect(currentDose([])).toBeNull();
  });

  it("carries the reason through on the resolved change", () => {
    expect(currentDoseChange(CHANGES, d("2026-08-01T00:00:00Z"))?.reason).toBe(
      "↑ALT/AST",
    );
  });
});
