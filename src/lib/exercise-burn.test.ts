import { describe, expect, it } from "vitest";

import { exerciseBurn, stepsBurn, workoutBurn } from "./exercise-burn";

describe("stepsBurn", () => {
  it("uses ~0.04 kcal/step", () => {
    expect(stepsBurn(10000)).toBe(400);
    expect(stepsBurn(0)).toBe(0);
    expect(stepsBurn(-5)).toBe(0);
  });
});

describe("workoutBurn", () => {
  it("uses the MET formula (default MET 5, 70 kg)", () => {
    // 5 * 3.5 * 70 / 200 * 30 = 183.75 → 184
    expect(workoutBurn(30)).toBe(184);
    expect(workoutBurn(0)).toBe(0);
  });

  it("scales with bodyweight", () => {
    expect(workoutBurn(30, 90)).toBeGreaterThan(workoutBurn(30, 70));
  });
});

describe("exerciseBurn", () => {
  it("sums steps + workout", () => {
    expect(
      exerciseBurn({ steps: 10000, workoutMinutes: 30, weightKg: 70 }),
    ).toBe(stepsBurn(10000) + workoutBurn(30, 70));
    expect(exerciseBurn({})).toBe(0);
  });
});
