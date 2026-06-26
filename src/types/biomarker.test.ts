import { describe, expect, it } from "vitest";

import { ageFromBirthYear, resolveRange, type RefRange } from "./biomarker";

describe("resolveRange", () => {
  const ranges: RefRange[] = [
    { low: 10, high: 50, unit: "U/L" }, // general default
    { sex: "M", low: 20, high: 60 },
    { sex: "F", low: 8, high: 40 },
    { sex: "M", ageMin: 50, low: 15, high: 55, note: "older men" },
  ];

  it("returns the general default when sex/age are unknown", () => {
    expect(resolveRange(ranges, { sex: null, age: null })).toMatchObject({
      low: 10,
      high: 50,
    });
  });

  it("prefers a sex-specific rule over the default", () => {
    expect(resolveRange(ranges, { sex: "F", age: null })).toMatchObject({
      low: 8,
      high: 40,
    });
  });

  it("prefers a sex+age rule when the age falls in the band", () => {
    expect(resolveRange(ranges, { sex: "M", age: 55 })).toMatchObject({
      low: 15,
      high: 55,
      note: "older men",
    });
  });

  it("falls back to the sex-only rule when age is outside the band", () => {
    expect(resolveRange(ranges, { sex: "M", age: 30 })).toMatchObject({
      low: 20,
      high: 60,
    });
  });

  it("ignores age-bounded rules when the age is unknown", () => {
    expect(resolveRange(ranges, { sex: "M", age: null })).toMatchObject({
      low: 20,
      high: 60,
    });
  });

  it("returns null when there are no ranges", () => {
    expect(resolveRange([], { sex: "M", age: 40 })).toBeNull();
  });
});

describe("ageFromBirthYear", () => {
  it("computes age from the provided 'now'", () => {
    expect(ageFromBirthYear(1990, new Date(2026, 0, 1))).toBe(36);
  });

  it("returns null when the birth year is missing", () => {
    expect(ageFromBirthYear(null)).toBeNull();
    expect(ageFromBirthYear(undefined)).toBeNull();
  });
});
