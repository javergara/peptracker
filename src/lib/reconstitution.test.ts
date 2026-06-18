import { describe, expect, it } from "vitest";

import { calculateReconstitution } from "@/lib/reconstitution";

describe("calculateReconstitution", () => {
  it("computes the canonical 10mg / 2mL / 250mcg example", () => {
    const result = calculateReconstitution({
      vialMg: 10,
      bacWaterMl: 2,
      doseMcg: 250,
    });

    expect(result.concentrationMcgPerMl).toBe(5000);
    expect(result.concentrationMgPerMl).toBe(5);
    expect(result.drawMl).toBe(0.05);
    expect(result.insulinUnits).toBe(5);
    expect(result.dosesPerVial).toBe(40);
  });

  it("defaults syringeUnits to 100 (U-100)", () => {
    const withDefault = calculateReconstitution({
      vialMg: 5,
      bacWaterMl: 1,
      doseMcg: 500,
    });
    const explicit = calculateReconstitution({
      vialMg: 5,
      bacWaterMl: 1,
      doseMcg: 500,
      syringeUnits: 100,
    });
    expect(withDefault.insulinUnits).toBe(explicit.insulinUnits);
  });

  it("respects a custom syringeUnits (U-50)", () => {
    const result = calculateReconstitution({
      vialMg: 10,
      bacWaterMl: 2,
      doseMcg: 250,
      syringeUnits: 50,
    });
    // drawMl 0.05 * 50 = 2.5
    expect(result.insulinUnits).toBe(2.5);
  });

  it("floors dosesPerVial", () => {
    const result = calculateReconstitution({
      vialMg: 10,
      bacWaterMl: 2,
      doseMcg: 300,
    });
    // 10000 / 300 = 33.33 -> 33
    expect(result.dosesPerVial).toBe(33);
  });

  it("rounds drawMl to 3 decimals and units to 1 decimal", () => {
    const result = calculateReconstitution({
      vialMg: 5,
      bacWaterMl: 3,
      doseMcg: 200,
    });
    // conc = 5000/3 = 1666.67 mcg/mL; drawMl = 200/1666.67 = 0.12
    expect(result.drawMl).toBe(0.12);
    expect(result.insulinUnits).toBe(12);
  });

  it.each([
    ["zero vial", { vialMg: 0, bacWaterMl: 2, doseMcg: 250 }],
    ["zero water", { vialMg: 10, bacWaterMl: 0, doseMcg: 250 }],
    ["zero dose", { vialMg: 10, bacWaterMl: 2, doseMcg: 0 }],
    ["negative vial", { vialMg: -10, bacWaterMl: 2, doseMcg: 250 }],
  ])("returns all zeros for %s", (_label, input) => {
    expect(calculateReconstitution(input)).toEqual({
      concentrationMcgPerMl: 0,
      concentrationMgPerMl: 0,
      drawMl: 0,
      insulinUnits: 0,
      dosesPerVial: 0,
    });
  });
});
