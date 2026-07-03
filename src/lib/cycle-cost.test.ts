import { describe, expect, it } from "vitest";

import {
  estimateCyclePeptideCost,
  sumCyclePeptideCosts,
  type CyclePeptideCost,
} from "./cycle-cost";

describe("estimateCyclePeptideCost", () => {
  const supply = { price: 60, vialMcg: 5000 }; // 20 doses/vial @ 250mcg → $3/dose

  it("computes perDose, spentSoFar, and a fixed-span projection", () => {
    const result = estimateCyclePeptideCost(
      {
        peptideId: "p1",
        doseMcg: 250,
        frequency: "daily",
        supply,
        loggedDoseCount: 10,
      },
      56, // 8-week cycle
    );
    expect(result.perDose).toBeCloseTo(3, 6);
    expect(result.spentSoFar).toBeCloseTo(30, 6); // 10 doses * $3
    expect(result.projected).toBeCloseTo(168, 6); // $3 * 1/day * 56 days
  });

  it("projects per-month for an open-ended cycle (days = null)", () => {
    const result = estimateCyclePeptideCost(
      {
        peptideId: "p1",
        doseMcg: 250,
        frequency: "daily",
        supply,
        loggedDoseCount: 0,
      },
      null,
    );
    expect(result.projected).toBeCloseTo(91.32, 2);
  });

  it("is all-null when there is no priced supply", () => {
    const result = estimateCyclePeptideCost(
      {
        peptideId: "p1",
        doseMcg: 250,
        frequency: "daily",
        supply: null,
        loggedDoseCount: 5,
      },
      30,
    );
    expect(result.perDose).toBeNull();
    expect(result.spentSoFar).toBeNull();
    expect(result.projected).toBeNull();
  });

  it("is all-null when dose is unknown", () => {
    const result = estimateCyclePeptideCost(
      {
        peptideId: "p1",
        doseMcg: null,
        frequency: "daily",
        supply,
        loggedDoseCount: 5,
      },
      30,
    );
    expect(result.perDose).toBeNull();
  });
});

describe("sumCyclePeptideCosts", () => {
  it("sums spentSoFar and projected across priced peptides", () => {
    const costs: CyclePeptideCost[] = [
      { peptideId: "a", perDose: 3, spentSoFar: 30, projected: 168 },
      { peptideId: "b", perDose: 5, spentSoFar: 50, projected: 280 },
    ];
    const summary = sumCyclePeptideCosts(costs);
    expect(summary.hasData).toBe(true);
    expect(summary.spentSoFar).toBeCloseTo(80, 6);
    expect(summary.projected).toBeCloseTo(448, 6);
  });

  it("skips unpriced peptides", () => {
    const costs: CyclePeptideCost[] = [
      { peptideId: "a", perDose: 3, spentSoFar: 30, projected: 168 },
      { peptideId: "b", perDose: null, spentSoFar: null, projected: null },
    ];
    const summary = sumCyclePeptideCosts(costs);
    expect(summary.hasData).toBe(true);
    expect(summary.spentSoFar).toBeCloseTo(30, 6);
    expect(summary.projected).toBeCloseTo(168, 6);
  });

  it("has no data when nothing is priced", () => {
    const costs: CyclePeptideCost[] = [
      { peptideId: "a", perDose: null, spentSoFar: null, projected: null },
    ];
    const summary = sumCyclePeptideCosts(costs);
    expect(summary).toEqual({
      spentSoFar: null,
      projected: null,
      hasData: false,
    });
  });

  it("projected is null when any priced peptide's own projection is unknown", () => {
    const costs: CyclePeptideCost[] = [
      { peptideId: "a", perDose: 3, spentSoFar: 30, projected: 168 },
      { peptideId: "b", perDose: 5, spentSoFar: 50, projected: null }, // e.g. custom frequency
    ];
    const summary = sumCyclePeptideCosts(costs);
    expect(summary.spentSoFar).toBeCloseTo(80, 6);
    expect(summary.projected).toBeNull();
  });
});
