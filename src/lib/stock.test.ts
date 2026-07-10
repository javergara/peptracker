import { describe, expect, it } from "vitest";

import {
  estimateStockSupply,
  formatVialSize,
  frequencyDosesPerDay,
  isLowStock,
  toMcg,
} from "@/lib/stock";

describe("formatVialSize", () => {
  it("shows peptide vials in mg", () => {
    expect(formatVialSize(5000)).toBe("5 mg");
    expect(formatVialSize(10000, "GLP_GIP")).toBe("10 mg");
    expect(formatVialSize(500)).toBe("0.5 mg");
  });
  it("shows diluent vials in mL (same numeric column)", () => {
    expect(formatVialSize(3000, "DILUENT")).toBe("3 mL");
    expect(formatVialSize(10000, "DILUENT")).toBe("10 mL");
  });
});

describe("frequencyDosesPerDay", () => {
  it("maps known cadences", () => {
    expect(frequencyDosesPerDay("daily")).toBe(1);
    expect(frequencyDosesPerDay("eod")).toBe(0.5);
    expect(frequencyDosesPerDay("twice-weekly")).toBeCloseTo(2 / 7);
    expect(frequencyDosesPerDay("weekly")).toBeCloseTo(1 / 7);
  });

  it("returns null for custom/unknown", () => {
    expect(frequencyDosesPerDay("custom")).toBeNull();
    expect(frequencyDosesPerDay("whatever")).toBeNull();
  });
});

describe("toMcg", () => {
  it("passes mcg through and scales mg", () => {
    expect(toMcg(250, "mcg")).toBe(250);
    expect(toMcg(2, "mg")).toBe(2000);
  });
  it("returns null when absent", () => {
    expect(toMcg(null, "mcg")).toBeNull();
    expect(toMcg(undefined, "mg")).toBeNull();
  });
});

describe("estimateStockSupply", () => {
  it("estimates doses + days for a daily 250mcg from 5mg vials ×4", () => {
    const s = estimateStockSupply({
      vialMcg: 5000,
      quantity: 4,
      doseMcg: 250,
      frequency: "daily",
    });
    expect(s.dosesPerVial).toBe(20);
    expect(s.totalDoses).toBe(80);
    expect(s.days).toBe(80);
  });

  it("stretches days for twice-weekly dosing", () => {
    const s = estimateStockSupply({
      vialMcg: 5000,
      quantity: 1,
      doseMcg: 2000,
      frequency: "twice-weekly",
    });
    expect(s.dosesPerVial).toBe(2);
    expect(s.totalDoses).toBe(2);
    expect(s.days).toBe(7); // 2 doses / (2/7 per day) = 7
  });

  it("omits days when frequency is custom", () => {
    const s = estimateStockSupply({
      vialMcg: 5000,
      quantity: 2,
      doseMcg: 250,
      frequency: "custom",
    });
    expect(s.totalDoses).toBe(40);
    expect(s.days).toBeNull();
  });

  it("returns zeros when the dose is unknown", () => {
    expect(
      estimateStockSupply({
        vialMcg: 5000,
        quantity: 3,
        doseMcg: null,
        frequency: "daily",
      }),
    ).toEqual({ dosesPerVial: 0, totalDoses: 0, days: null });
  });
});

describe("isLowStock", () => {
  it("flags one vial or fewer", () => {
    expect(isLowStock(0)).toBe(true);
    expect(isLowStock(1)).toBe(true);
    expect(isLowStock(2)).toBe(false);
  });
});
