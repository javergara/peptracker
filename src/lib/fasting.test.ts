import { describe, expect, it } from "vitest";

import { fastingProgress, formatDuration } from "./fasting";

const HOUR = 3_600_000;

describe("fastingProgress", () => {
  it("computes elapsed + percentage against the target", () => {
    const start = new Date(0);
    const now = new Date(8 * HOUR);
    const p = fastingProgress(start, 16, now);
    expect(p.elapsedHours).toBe(8);
    expect(p.pct).toBe(50);
    expect(p.complete).toBe(false);
    expect(p.remainingMs).toBe(8 * HOUR);
  });

  it("clamps at 100% and flags complete", () => {
    const p = fastingProgress(new Date(0), 16, new Date(20 * HOUR));
    expect(p.pct).toBe(100);
    expect(p.complete).toBe(true);
    expect(p.remainingMs).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats hours + minutes", () => {
    expect(formatDuration(12 * HOUR + 34 * 60000)).toBe("12h 34m");
    expect(formatDuration(45 * 60000)).toBe("45m");
    expect(formatDuration(0)).toBe("0m");
  });
});
