import { describe, expect, it } from "vitest";

import {
  aggregateSpend,
  costOverDays,
  costPerDose,
  costPerMonth,
  dosesPerVial,
  formatCost,
} from "./cost";

describe("dosesPerVial", () => {
  it("floors vial/dose", () => {
    expect(dosesPerVial(5000, 250)).toBe(20);
    expect(dosesPerVial(5000, 300)).toBe(16); // 16.67 → 16
  });
  it("is 0 for missing/zero dose", () => {
    expect(dosesPerVial(5000, null)).toBe(0);
    expect(dosesPerVial(5000, 0)).toBe(0);
  });
});

describe("costPerDose", () => {
  it("splits price across doses per vial", () => {
    expect(costPerDose(60, 5000, 250)).toBeCloseTo(3, 6); // 20 doses → $3
  });
  it("is null when price or dose unknown", () => {
    expect(costPerDose(null, 5000, 250)).toBeNull();
    expect(costPerDose(60, 5000, null)).toBeNull();
  });
});

describe("costPerMonth", () => {
  it("scales per-dose by daily frequency over 30.44 days", () => {
    // $3/dose daily → 3 * 1 * 30.44
    expect(costPerMonth(3, "daily")).toBeCloseTo(91.32, 2);
    // every other day → half
    expect(costPerMonth(3, "eod")).toBeCloseTo(45.66, 2);
  });
  it("is null for custom/unknown frequency", () => {
    expect(costPerMonth(3, "custom")).toBeNull();
    expect(costPerMonth(null, "daily")).toBeNull();
  });
});

describe("costOverDays", () => {
  it("scales over an explicit day span", () => {
    expect(costOverDays(3, "daily", 56)).toBeCloseTo(168, 6); // 8-week cycle
  });
  it("is null when inputs unknown", () => {
    expect(costOverDays(null, "daily", 56)).toBeNull();
    expect(costOverDays(3, "custom", 56)).toBeNull();
  });
});

describe("formatCost", () => {
  it("formats and handles null", () => {
    expect(formatCost(3.5)).toBe("$3.50");
    expect(formatCost(null)).toBe("—");
    expect(formatCost(3.5, "€")).toBe("€3.50");
  });
});

describe("aggregateSpend", () => {
  it("totals and groups by peptide, highest first", () => {
    const r = aggregateSpend([
      { peptideId: "a", peptideName: "AAA", amount: 50 },
      { peptideId: "b", peptideName: "BBB", amount: 120 },
      { peptideId: "a", peptideName: "AAA", amount: 30 },
    ]);
    expect(r.total).toBe(200);
    expect(r.pricedLines).toBe(3);
    expect(r.byPeptide).toEqual([
      { peptideId: "b", peptideName: "BBB", amount: 120 },
      { peptideId: "a", peptideName: "AAA", amount: 80 },
    ]);
  });

  it("ignores lines with no/invalid price", () => {
    const r = aggregateSpend([
      { peptideId: "a", peptideName: "AAA", amount: 0 },
      { peptideId: "b", peptideName: "BBB", amount: NaN },
      { peptideId: "c", peptideName: "CCC", amount: 40 },
    ]);
    expect(r.total).toBe(40);
    expect(r.pricedLines).toBe(1);
    expect(r.byPeptide).toHaveLength(1);
  });

  it("is empty for no priced lines", () => {
    expect(aggregateSpend([])).toEqual({
      total: 0,
      byPeptide: [],
      pricedLines: 0,
    });
  });
});
