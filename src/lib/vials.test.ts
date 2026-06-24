import { describe, expect, it } from "vitest";

import {
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
