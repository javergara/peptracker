import { describe, expect, it } from "vitest";

import { doseDefaultsByPeptide, parseDoseAmount } from "@/lib/cycles";

describe("parseDoseAmount", () => {
  it("parses a number + mcg", () => {
    expect(parseDoseAmount("250 mcg")).toEqual({ dose: 250, unit: "mcg" });
  });

  it("parses mg (no space)", () => {
    expect(parseDoseAmount("2mg")).toEqual({ dose: 2, unit: "mg" });
  });

  it("defaults the unit to mcg when absent", () => {
    expect(parseDoseAmount("500")).toEqual({ dose: 500, unit: "mcg" });
  });

  it("takes the first number from a range", () => {
    expect(parseDoseAmount("200-300 mcg")).toEqual({ dose: 200, unit: "mcg" });
  });

  it("returns just a unit when there is no number", () => {
    expect(parseDoseAmount("as directed")).toEqual({ unit: "mcg" });
  });

  it("handles null/undefined/empty", () => {
    expect(parseDoseAmount(null)).toEqual({});
    expect(parseDoseAmount(undefined)).toEqual({});
    expect(parseDoseAmount("")).toEqual({});
  });
});

describe("doseDefaultsByPeptide", () => {
  it("indexes items by peptideId", () => {
    expect(
      doseDefaultsByPeptide([
        { peptideId: "a", dose: 250, unit: "mcg" },
        { peptideId: "b", dose: 2, unit: "mg" },
      ]),
    ).toEqual({
      a: { dose: 250, unit: "mcg" },
      b: { dose: 2, unit: "mg" },
    });
  });

  it("returns an empty map for undefined", () => {
    expect(doseDefaultsByPeptide(undefined)).toEqual({});
  });
});
