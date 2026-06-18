import { describe, expect, it } from "vitest";

import { kgToLb, lbToKg, mcgToMg, mgToMcg, roundTo } from "@/lib/units";

describe("units", () => {
  describe("mcgToMg / mgToMcg", () => {
    it("converts mcg to mg", () => {
      expect(mcgToMg(1000)).toBe(1);
      expect(mcgToMg(250)).toBe(0.25);
      expect(mcgToMg(0)).toBe(0);
    });

    it("converts mg to mcg", () => {
      expect(mgToMcg(1)).toBe(1000);
      expect(mgToMcg(0.25)).toBe(250);
      expect(mgToMcg(0)).toBe(0);
    });

    it("round-trips", () => {
      expect(mcgToMg(mgToMcg(5))).toBe(5);
    });
  });

  describe("kgToLb / lbToKg", () => {
    it("converts kg to lb", () => {
      expect(roundTo(kgToLb(100), 2)).toBe(220.46);
    });

    it("converts lb to kg", () => {
      expect(roundTo(lbToKg(220.46), 2)).toBe(100);
    });

    it("round-trips approximately", () => {
      expect(roundTo(lbToKg(kgToLb(80)), 4)).toBe(80);
    });
  });

  describe("roundTo", () => {
    it("defaults to 2 decimals", () => {
      expect(roundTo(1.23456)).toBe(1.23);
    });

    it("respects a custom precision", () => {
      expect(roundTo(1.23456, 3)).toBe(1.235);
      expect(roundTo(1.23456, 0)).toBe(1);
    });

    it("handles negatives and zero", () => {
      expect(roundTo(-1.005, 2)).toBe(-1);
      expect(roundTo(0)).toBe(0);
    });
  });
});
