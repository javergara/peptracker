import { describe, expect, it } from "vitest";

import {
  comparePhases,
  effectSizeLabel,
  inAnyWindow,
  type PhasePoint,
  type PhaseWindow,
} from "./cycle-comparison";

const DAY = 86_400_000;
const t0 = new Date("2026-01-01T00:00:00Z").getTime();
const day = (i: number) => t0 + i * DAY;

describe("inAnyWindow", () => {
  const windows: PhaseWindow[] = [{ start: day(5), end: day(10) }];
  it("includes boundaries and interior", () => {
    expect(inAnyWindow(day(5), windows, day(30))).toBe(true);
    expect(inAnyWindow(day(7), windows, day(30))).toBe(true);
    expect(inAnyWindow(day(10), windows, day(30))).toBe(true);
  });
  it("excludes outside", () => {
    expect(inAnyWindow(day(4), windows, day(30))).toBe(false);
    expect(inAnyWindow(day(11), windows, day(30))).toBe(false);
  });
  it("treats a null end as ongoing up to now", () => {
    const ongoing: PhaseWindow[] = [{ start: day(5), end: null }];
    expect(inAnyWindow(day(100), ongoing, day(200))).toBe(true);
    expect(inAnyWindow(day(300), ongoing, day(200))).toBe(false);
  });
});

describe("comparePhases", () => {
  const windows: PhaseWindow[] = [{ start: day(10), end: day(20) }];

  it("splits points and computes the on/off means and delta", () => {
    const points: PhasePoint[] = [
      { date: day(0), value: 100 }, // off
      { date: day(5), value: 102 }, // off
      { date: day(12), value: 90 }, // on
      { date: day(18), value: 86 }, // on
      { date: day(25), value: 101 }, // off
    ];
    const c = comparePhases(points, windows, day(40));
    expect(c.onN).toBe(2);
    expect(c.offN).toBe(3);
    expect(c.onMean).toBe(88);
    expect(c.offMean).toBeCloseTo(101, 5);
    expect(c.delta).toBeCloseTo(-13, 5);
    expect(c.percentChange).toBeCloseTo((-13 / 101) * 100, 5);
  });

  it("returns nulls when a phase has no points", () => {
    const points: PhasePoint[] = [{ date: day(0), value: 100 }];
    const c = comparePhases(points, windows, day(40));
    expect(c.onMean).toBeNull();
    expect(c.delta).toBeNull();
    expect(c.percentChange).toBeNull();
    expect(c.cohensD).toBeNull();
  });

  it("computes a Cohen's d effect size when both phases have spread", () => {
    const points: PhasePoint[] = [
      { date: day(0), value: 100 },
      { date: day(2), value: 104 },
      { date: day(4), value: 96 },
      { date: day(12), value: 80 },
      { date: day(14), value: 84 },
      { date: day(16), value: 76 },
    ];
    const c = comparePhases(points, windows, day(40));
    expect(c.cohensD).not.toBeNull();
    // on mean (80) well below off mean (100) → large negative effect.
    expect(c.cohensD!).toBeLessThan(-0.8);
    expect(effectSizeLabel(c.cohensD)).toBe("large");
  });

  it("null Cohen's d when a phase has fewer than two points", () => {
    const points: PhasePoint[] = [
      { date: day(0), value: 100 },
      { date: day(2), value: 104 },
      { date: day(12), value: 80 }, // only one on-point
    ];
    expect(comparePhases(points, windows, day(40)).cohensD).toBeNull();
  });
});

describe("effectSizeLabel", () => {
  it("buckets magnitude", () => {
    expect(effectSizeLabel(0.1)).toBe("negligible");
    expect(effectSizeLabel(-0.3)).toBe("small");
    expect(effectSizeLabel(0.6)).toBe("medium");
    expect(effectSizeLabel(-1.2)).toBe("large");
    expect(effectSizeLabel(null)).toBeNull();
  });
});
