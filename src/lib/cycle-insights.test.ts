import { describe, expect, it } from "vitest";

import {
  computeCycleInsights,
  type MetricPoint,
  BASELINE_WINDOW_DAYS,
} from "./cycle-insights";

const d = (s: string) => new Date(s);

const cycleStart = d("2026-02-01");
const cycleEnd = d("2026-03-01");

describe("computeCycleInsights", () => {
  it("computes baseline avg, latest in-cycle value, and deltas", () => {
    const points: MetricPoint[] = [
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-01-20"),
        value: 80,
      },
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-01-25"),
        value: 82,
      }, // avg baseline = 81
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-02-10"),
        value: 79,
      },
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-02-20"),
        value: 77,
      }, // latest in-cycle
    ];
    const [insight] = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insight.key).toBe("weight");
    expect(insight.baseline).toBeCloseTo(81, 6);
    expect(insight.latest).toBe(77);
    expect(insight.deltaAbs).toBeCloseTo(-4, 6);
    expect(insight.deltaPct).toBeCloseTo((-4 / 81) * 100, 6);
    expect(insight.direction).toBe("down");
  });

  it("excludes a metric with no baseline point", () => {
    const points: MetricPoint[] = [
      {
        key: "sleep",
        label: "Sleep",
        unit: "h",
        date: d("2026-02-10"),
        value: 7,
      },
    ];
    expect(computeCycleInsights(points, cycleStart, cycleEnd)).toEqual([]);
  });

  it("excludes a metric with no in-cycle point", () => {
    const points: MetricPoint[] = [
      {
        key: "sleep",
        label: "Sleep",
        unit: "h",
        date: d("2026-01-15"),
        value: 7,
      },
    ];
    expect(computeCycleInsights(points, cycleStart, cycleEnd)).toEqual([]);
  });

  it("excludes baseline points older than the baseline window", () => {
    const tooOld = new Date(
      cycleStart.getTime() - (BASELINE_WINDOW_DAYS + 5) * 24 * 60 * 60 * 1000,
    );
    const points: MetricPoint[] = [
      { key: "sleep", label: "Sleep", unit: "h", date: tooOld, value: 6 },
      {
        key: "sleep",
        label: "Sleep",
        unit: "h",
        date: d("2026-02-10"),
        value: 7,
      },
    ];
    expect(computeCycleInsights(points, cycleStart, cycleEnd)).toEqual([]);
  });

  it("uses the most recent in-cycle point as latest", () => {
    const points: MetricPoint[] = [
      {
        key: "recovery",
        label: "Recovery",
        unit: "/100",
        date: d("2026-01-15"),
        value: 60,
      },
      {
        key: "recovery",
        label: "Recovery",
        unit: "/100",
        date: d("2026-02-05"),
        value: 65,
      },
      {
        key: "recovery",
        label: "Recovery",
        unit: "/100",
        date: d("2026-02-25"),
        value: 70,
      },
    ];
    const [insight] = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insight.latest).toBe(70);
    expect(insight.direction).toBe("up");
  });

  it("returns a null deltaPct when baseline is 0", () => {
    const points: MetricPoint[] = [
      {
        key: "custom",
        label: "Custom",
        unit: null,
        date: d("2026-01-15"),
        value: 0,
      },
      {
        key: "custom",
        label: "Custom",
        unit: null,
        date: d("2026-02-10"),
        value: 5,
      },
    ];
    const [insight] = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insight.deltaPct).toBeNull();
    expect(insight.direction).toBe("up");
  });

  it("is flat when baseline equals latest", () => {
    const points: MetricPoint[] = [
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-01-15"),
        value: 80,
      },
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-02-10"),
        value: 80,
      },
    ];
    const [insight] = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insight.direction).toBe("flat");
    expect(insight.deltaAbs).toBe(0);
  });

  it("ranks by magnitude of percent change, descending; null-pct last", () => {
    const points: MetricPoint[] = [
      // 5% change
      { key: "a", label: "A", unit: null, date: d("2026-01-15"), value: 100 },
      { key: "a", label: "A", unit: null, date: d("2026-02-10"), value: 105 },
      // 50% change
      { key: "b", label: "B", unit: null, date: d("2026-01-15"), value: 100 },
      { key: "b", label: "B", unit: null, date: d("2026-02-10"), value: 150 },
      // null pct (baseline 0)
      { key: "c", label: "C", unit: null, date: d("2026-01-15"), value: 0 },
      { key: "c", label: "C", unit: null, date: d("2026-02-10"), value: 10 },
    ];
    const insights = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insights.map((i) => i.key)).toEqual(["b", "a", "c"]);
  });

  it("keeps metrics independent by key", () => {
    const points: MetricPoint[] = [
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-01-15"),
        value: 80,
      },
      {
        key: "weight",
        label: "Weight",
        unit: "kg",
        date: d("2026-02-10"),
        value: 78,
      },
      {
        key: "sleep",
        label: "Sleep",
        unit: "h",
        date: d("2026-01-20"),
        value: 6,
      },
      {
        key: "sleep",
        label: "Sleep",
        unit: "h",
        date: d("2026-02-15"),
        value: 7.5,
      },
    ];
    const insights = computeCycleInsights(points, cycleStart, cycleEnd);
    expect(insights).toHaveLength(2);
    expect(insights.map((i) => i.key).sort()).toEqual(["sleep", "weight"]);
  });
});
