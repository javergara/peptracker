import { describe, expect, it } from "vitest";

import {
  applyVialDraw,
  creditVialDraw,
  doseDrawMcg,
  vialConcentration,
  vialDosesRemaining,
  vialExpiryStatus,
} from "./vials";

describe("vialConcentration", () => {
  it("computes mcg/mL", () => {
    expect(vialConcentration(10000, 2)).toBe(5000);
  });
  it("returns null without diluent", () => {
    expect(vialConcentration(10000, null)).toBeNull();
    expect(vialConcentration(10000, 0)).toBeNull();
  });
});

describe("vialDosesRemaining", () => {
  it("floors whole doses", () => {
    expect(vialDosesRemaining(10000, 250)).toBe(40);
    expect(vialDosesRemaining(900, 250)).toBe(3);
  });
  it("guards zero/empty", () => {
    expect(vialDosesRemaining(1000, 0)).toBe(0);
    expect(vialDosesRemaining(0, 250)).toBe(0);
  });
});

describe("vialExpiryStatus", () => {
  const now = new Date("2026-06-24T12:00:00Z");
  it("none when no expiry", () => {
    expect(vialExpiryStatus(null, now)).toBe("none");
  });
  it("expired in the past", () => {
    expect(vialExpiryStatus(new Date("2026-06-20T12:00:00Z"), now)).toBe(
      "expired",
    );
  });
  it("soon within 7 days", () => {
    expect(vialExpiryStatus(new Date("2026-06-28T12:00:00Z"), now)).toBe(
      "soon",
    );
  });
  it("ok when far out", () => {
    expect(vialExpiryStatus(new Date("2026-07-30T12:00:00Z"), now)).toBe("ok");
  });
});

describe("doseDrawMcg", () => {
  it("passes mcg through and scales mg", () => {
    expect(doseDrawMcg(250, "mcg")).toBe(250);
    expect(doseDrawMcg(2, "mg")).toBe(2000);
    expect(doseDrawMcg(250, null)).toBe(250);
  });
});

describe("applyVialDraw", () => {
  it("decrements and stays active", () => {
    expect(applyVialDraw({ remainingMcg: 1000 }, 250)).toEqual({
      remainingMcg: 750,
      status: "active",
    });
  });
  it("empties at or below zero (no negatives)", () => {
    expect(applyVialDraw({ remainingMcg: 200 }, 250)).toEqual({
      remainingMcg: 0,
      status: "empty",
    });
  });
});

describe("creditVialDraw", () => {
  it("credits back and revives an emptied vial", () => {
    expect(
      creditVialDraw({ remainingMcg: 0, totalMcg: 5000, status: "empty" }, 250),
    ).toEqual({ remainingMcg: 250, status: "active" });
  });
  it("clamps to the vial total", () => {
    expect(
      creditVialDraw(
        { remainingMcg: 4900, totalMcg: 5000, status: "active" },
        250,
      ),
    ).toEqual({ remainingMcg: 5000, status: "active" });
  });
  it("leaves sealed/expired status untouched", () => {
    expect(
      creditVialDraw(
        { remainingMcg: 500, totalMcg: 5000, status: "expired" },
        250,
      ).status,
    ).toBe("expired");
  });
  it("round-trips applyVialDraw", () => {
    const vial = { remainingMcg: 1000, totalMcg: 5000, status: "active" };
    const drawn = applyVialDraw(vial, 250);
    const credited = creditVialDraw(
      { ...vial, remainingMcg: drawn.remainingMcg, status: drawn.status },
      250,
    );
    expect(credited.remainingMcg).toBe(1000);
  });
});
