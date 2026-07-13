import { describe, expect, it } from "vitest";

import {
  describeInsight,
  findStrongCorrelations,
  type CorrelationSeries,
} from "./correlations";

const DAY = 86_400_000;
const t0 = new Date("2026-01-01T00:00:00Z").getTime();

/** Build a series of n points, one per day starting at t0, from a value fn. */
function series(
  key: string,
  label: string,
  n: number,
  valueAt: (i: number) => number,
  unit?: string,
): CorrelationSeries {
  return {
    key,
    label,
    unit,
    points: Array.from({ length: n }, (_, i) => ({
      date: t0 + i * DAY,
      value: valueAt(i),
    })),
  };
}

describe("findStrongCorrelations", () => {
  it("detects a strong positive correlation", () => {
    const sleep = series("m:sleep", "Sleep", 10, (i) => 6 + i * 0.3);
    const hrv = series("l:hrv", "HRV", 10, (i) => 40 + i * 2);

    const insights = findStrongCorrelations([sleep, hrv]);
    expect(insights).toHaveLength(1);
    const [insight] = insights;
    expect(insight.aKey).toBe("m:sleep");
    expect(insight.bKey).toBe("l:hrv");
    expect(insight.direction).toBe("positive");
    expect(insight.r).toBeGreaterThan(0.9);
    expect(insight.n).toBe(10);
    expect(insight.strength).toBe("strong");
  });

  it("detects a strong anti-correlation (inverse direction, negative r)", () => {
    const weight = series("m:weight", "Weight", 10, (i) => 90 - i * 0.5);
    const energy = series("energy", "Energy", 10, (i) => 2 + i * 0.3);

    const insights = findStrongCorrelations([weight, energy]);
    expect(insights).toHaveLength(1);
    expect(insights[0].direction).toBe("inverse");
    expect(insights[0].r).toBeLessThan(0);
  });

  it("excludes pairs with too few paired points (n below minN)", () => {
    // Only 3 points each — below the default minN of 6.
    const a = series("a", "A", 3, (i) => i);
    const b = series("b", "B", 3, (i) => i * 2);

    expect(findStrongCorrelations([a, b])).toHaveLength(0);
  });

  it("rejects a spurious small-sample correlation (not significant)", () => {
    // A moderately-strong r over very few points is not statistically
    // significant, so the significance gate drops it even though |r| ≥ 0.5.
    const a: CorrelationSeries = {
      key: "a",
      label: "A",
      points: [0, 1, 2, 3, 4, 5].map((i) => ({ date: t0 + i * DAY, value: i })),
    };
    const b: CorrelationSeries = {
      key: "b",
      label: "B",
      // Noisy: r lands in the ~0.5 range but p ≥ 0.05 at n = 6.
      points: [2, 0, 3, 1, 4, 2].map((v, i) => ({
        date: t0 + i * DAY,
        value: v,
      })),
    };
    const insights = findStrongCorrelations([a, b], { threshold: 0.4 });
    for (const ins of insights) expect(ins.pValue).toBeLessThan(0.05);
  });

  it("pairs one-to-one (does not reuse one point to inflate n)", () => {
    // a has ONE point; b has 8 near it. One-to-one pairing yields a single
    // pair (n=1), not 8 — so nothing significant can be manufactured.
    const a: CorrelationSeries = {
      key: "a",
      label: "A",
      points: [{ date: t0, value: 5 }],
    };
    const b: CorrelationSeries = {
      key: "b",
      label: "B",
      points: Array.from({ length: 8 }, (_, i) => ({
        date: t0 + i * DAY,
        value: i,
      })),
    };
    expect(findStrongCorrelations([a, b])).toHaveLength(0);
  });

  it("excludes pairs whose points fall outside the 14-day pairing window", () => {
    const a: CorrelationSeries = {
      key: "a",
      label: "A",
      points: Array.from({ length: 6 }, (_, i) => ({
        date: t0 + i * DAY,
        value: i,
      })),
    };
    // b's points are all >14 days away from any of a's points.
    const b: CorrelationSeries = {
      key: "b",
      label: "B",
      points: Array.from({ length: 6 }, (_, i) => ({
        date: t0 + 100 * DAY + i * DAY,
        value: i * 2,
      })),
    };

    expect(findStrongCorrelations([a, b])).toHaveLength(0);
  });

  it("excludes pairs with no meaningful correlation (|r| below threshold)", () => {
    // Deliberately uncorrelated / noisy signal.
    const a = series("a", "A", 10, (i) => (i % 2 === 0 ? 1 : 10));
    const b = series("b", "B", 10, () => 5);

    expect(findStrongCorrelations([a, b])).toHaveLength(0);
  });

  it("de-dupes symmetric pairs — each unordered pair appears once", () => {
    const a = series("a", "A", 10, (i) => i);
    const b = series("b", "B", 10, (i) => i * 2);
    const c = series("c", "C", 10, (i) => i * 3);

    const insights = findStrongCorrelations([a, b, c]);
    // 3 series -> exactly 3 unordered pairs (a-b, a-c, b-c), all correlated.
    expect(insights).toHaveLength(3);
    const pairKeys = insights.map((ins) =>
      [ins.aKey, ins.bKey].sort().join("|"),
    );
    expect(new Set(pairKeys).size).toBe(3);
  });

  it("ranks by |r| x sqrt(n), favoring strong AND well-sampled pairs", () => {
    // Pair 1: perfect correlation but few points.
    const small1 = series("s1", "Small1", 6, (i) => i);
    const small2 = series("s2", "Small2", 6, (i) => i * 2);
    // Pair 2: slightly noisy but many more points.
    const big1 = series("b1", "Big1", 30, (i) => i + (i % 3 === 0 ? 0.4 : 0));
    const big2 = series("b2", "Big2", 30, (i) => i * 2);

    const insights = findStrongCorrelations([small1, small2, big1, big2], {
      topK: 10,
    });
    expect(insights.length).toBeGreaterThanOrEqual(2);
    // The well-sampled pair should outrank the small perfect pair.
    const bigIdx = insights.findIndex((ins) => ins.aKey === "b1");
    const smallIdx = insights.findIndex((ins) => ins.aKey === "s1");
    expect(bigIdx).toBeLessThan(smallIdx);
  });

  it("respects topK", () => {
    const a = series("a", "A", 10, (i) => i);
    const b = series("b", "B", 10, (i) => i * 2);
    const c = series("c", "C", 10, (i) => i * 3);
    const d = series("d", "D", 10, (i) => i * 4);

    const insights = findStrongCorrelations([a, b, c, d], { topK: 2 });
    expect(insights).toHaveLength(2);
  });
});

describe("describeInsight", () => {
  it("phrases a positive correlation correlationally, not causally", () => {
    const sentence = describeInsight({
      aKey: "m:sleep",
      aLabel: "Sleep",
      bKey: "l:hrv",
      bLabel: "HRV",
      r: 0.62,
      rSquared: 0.38,
      n: 18,
      pValue: 0.006,
      coTrended: false,
      direction: "positive",
      strength: "strong",
    });
    expect(sentence).toBe(
      "Higher Sleep tends to go with higher HRV (r = 0.62, n = 18).",
    );
    expect(sentence.toLowerCase()).not.toContain("causes");
    expect(sentence.toLowerCase()).not.toContain("because");
  });

  it("phrases an inverse correlation with a negative r", () => {
    const sentence = describeInsight({
      aKey: "m:weight",
      aLabel: "Weight",
      bKey: "energy",
      bLabel: "Energy",
      r: -0.58,
      rSquared: 0.34,
      n: 12,
      pValue: 0.048,
      coTrended: false,
      direction: "inverse",
      strength: "moderate",
    });
    expect(sentence).toBe(
      "Higher Weight tends to go with lower Energy (r = −0.58, n = 12).",
    );
  });

  it("adds a shared-trend caveat when both series co-trend", () => {
    const sentence = describeInsight({
      aKey: "m:weight",
      aLabel: "Weight",
      bKey: "l:igf",
      bLabel: "IGF-1",
      r: -0.8,
      rSquared: 0.64,
      n: 10,
      pValue: 0.005,
      coTrended: true,
      direction: "inverse",
      strength: "strong",
    });
    expect(sentence).toContain("shared trend");
  });
});
