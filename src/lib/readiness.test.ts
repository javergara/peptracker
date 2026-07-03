import { describe, expect, it } from "vitest";

import {
  computeReadiness,
  deriveReadinessInputs,
  readinessLabel,
} from "./readiness";

describe("computeReadiness", () => {
  it("returns null when every input is null", () => {
    expect(
      computeReadiness({ sleep: null, hrv: null, restingHr: null, mood: null }),
    ).toBeNull();
  });

  it("scores 100 when every signal is at its best", () => {
    const result = computeReadiness({
      sleep: 8,
      hrv: 100,
      restingHr: 40,
      mood: 5,
    });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.available).toEqual(["sleep", "hrv", "restingHr", "mood"]);
    expect(result!.components).toHaveLength(4);
  });

  it("scores 0 when every signal is at its worst", () => {
    const result = computeReadiness({
      sleep: 0,
      hrv: 20,
      restingHr: 90,
      mood: 1,
    });
    expect(result!.score).toBe(0);
  });

  it("averages the signals that are present when some are null", () => {
    // Only sleep (best) and restingHr (worst) present — weighted 1.5 & 1.
    const result = computeReadiness({
      sleep: 8, // -> 100
      hrv: null,
      restingHr: 90, // -> 0
      mood: null,
    });
    expect(result).not.toBeNull();
    expect(result!.available).toEqual(["sleep", "restingHr"]);
    // (100*1.5 + 0*1) / 2.5 = 60
    expect(result!.score).toBe(60);
  });

  it("computes a score from a single available signal", () => {
    const result = computeReadiness({
      sleep: null,
      hrv: null,
      restingHr: null,
      mood: 3, // midpoint -> 50
    });
    expect(result).not.toBeNull();
    expect(result!.available).toEqual(["mood"]);
    expect(result!.score).toBe(50);
  });

  it("clamps out-of-range values instead of exceeding 0-100", () => {
    const high = computeReadiness({
      sleep: 12, // way over 8h baseline
      hrv: null,
      restingHr: null,
      mood: null,
    });
    expect(high!.score).toBe(100);
    expect(high!.components[0].contribution).toBe(100);

    const low = computeReadiness({
      sleep: null,
      hrv: 5, // below the 20ms floor
      restingHr: 120, // above the 90bpm ceiling
      mood: null,
    });
    expect(low!.components.every((c) => c.contribution === 0)).toBe(true);
    expect(low!.score).toBe(0);
  });

  it("treats NaN as missing", () => {
    const result = computeReadiness({
      sleep: Number.NaN,
      hrv: null,
      restingHr: null,
      mood: 4,
    });
    expect(result!.available).toEqual(["mood"]);
  });
});

describe("readinessLabel", () => {
  it("labels the three bands", () => {
    expect(readinessLabel(90)).toBe("Rested");
    expect(readinessLabel(75)).toBe("Rested");
    expect(readinessLabel(60)).toBe("Moderate");
    expect(readinessLabel(50)).toBe("Moderate");
    expect(readinessLabel(20)).toBe("Low");
  });
});

describe("deriveReadinessInputs", () => {
  it("picks the most recent value per measurement type", () => {
    const inputs = deriveReadinessInputs({
      measurements: [
        { type: "sleep", value: 6, recordedAt: new Date("2026-06-01") },
        { type: "sleep", value: 7.5, recordedAt: new Date("2026-06-03") },
        { type: "hrv", value: 55, recordedAt: new Date("2026-06-02") },
        { type: "restingHr", value: 58, recordedAt: new Date("2026-06-03") },
      ],
      checkInRatings: { mood: 4 },
    });
    expect(inputs).toEqual({ sleep: 7.5, hrv: 55, restingHr: 58, mood: 4 });
  });

  it("returns nulls for signals with no data", () => {
    const inputs = deriveReadinessInputs({ measurements: [] });
    expect(inputs).toEqual({
      sleep: null,
      hrv: null,
      restingHr: null,
      mood: null,
    });
  });

  it("ignores measurement types outside the readiness signal set", () => {
    const inputs = deriveReadinessInputs({
      measurements: [
        { type: "weight", value: 80, recordedAt: new Date("2026-06-03") },
      ],
    });
    expect(inputs.sleep).toBeNull();
  });
});
