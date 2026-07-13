import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  formatDate,
  isWithinRange,
  parseLocalDate,
} from "@/lib/dates";

describe("dates", () => {
  describe("formatDate", () => {
    it("uses the default pattern", () => {
      expect(formatDate(new Date(2026, 5, 18))).toBe("Jun 18, 2026");
    });

    it("accepts an ISO string", () => {
      expect(formatDate("2026-06-18T00:00:00", "yyyy-MM-dd")).toBe(
        "2026-06-18",
      );
    });

    it("respects a custom format", () => {
      expect(formatDate(new Date(2026, 0, 1), "MM/dd/yyyy")).toBe("01/01/2026");
    });
  });

  describe("daysBetween", () => {
    it("returns positive when b is after a", () => {
      expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 11))).toBe(10);
    });

    it("returns negative when b is before a", () => {
      expect(daysBetween(new Date(2026, 0, 11), new Date(2026, 0, 1))).toBe(
        -10,
      );
    });

    it("returns 0 for the same day", () => {
      expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(0);
    });
  });

  describe("addDays", () => {
    it("adds days", () => {
      expect(addDays(new Date(2026, 0, 1), 5)).toEqual(new Date(2026, 0, 6));
    });

    it("subtracts days with a negative count", () => {
      expect(addDays(new Date(2026, 0, 6), -5)).toEqual(new Date(2026, 0, 1));
    });

    it("does not mutate the input", () => {
      const d = new Date(2026, 0, 1);
      addDays(d, 5);
      expect(d).toEqual(new Date(2026, 0, 1));
    });
  });

  describe("isWithinRange", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 31);

    it("includes the start and end bounds", () => {
      expect(isWithinRange(start, start, end)).toBe(true);
      expect(isWithinRange(end, start, end)).toBe(true);
    });

    it("includes a date inside the range", () => {
      expect(isWithinRange(new Date(2026, 0, 15), start, end)).toBe(true);
    });

    it("excludes dates before start or after end", () => {
      expect(isWithinRange(new Date(2025, 11, 31), start, end)).toBe(false);
      expect(isWithinRange(new Date(2026, 1, 1), start, end)).toBe(false);
    });

    it("treats null end as open-ended", () => {
      expect(isWithinRange(new Date(2030, 0, 1), start, null)).toBe(true);
      expect(isWithinRange(new Date(2025, 0, 1), start, null)).toBe(false);
    });
  });

  describe("parseLocalDate", () => {
    it("parses yyyy-MM-dd to local midnight (not UTC)", () => {
      const d = parseLocalDate("2026-07-13");
      expect(d).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0));
      // Local Y/M/D must match the input regardless of the runner's TZ.
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(6);
      expect(d?.getDate()).toBe(13);
      expect(d?.getHours()).toBe(0);
    });
    it("returns null for missing/malformed input", () => {
      expect(parseLocalDate("")).toBeNull();
      expect(parseLocalDate(null)).toBeNull();
      expect(parseLocalDate(undefined)).toBeNull();
      expect(parseLocalDate("2026/07/13")).toBeNull();
      expect(parseLocalDate("13-07-2026")).toBeNull();
    });
  });
});
