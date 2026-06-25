import { describe, expect, it } from "vitest";

import { averageMood, moodFace } from "./mood";

describe("moodFace", () => {
  it("returns null for missing values", () => {
    expect(moodFace(null)).toBeNull();
    expect(moodFace(undefined)).toBeNull();
    expect(moodFace(NaN)).toBeNull();
  });

  it("maps the 1-5 scale to faces", () => {
    expect(moodFace(1)?.emoji).toBe("😢");
    expect(moodFace(2)?.emoji).toBe("🙁");
    expect(moodFace(3)?.emoji).toBe("😐");
    expect(moodFace(4)?.emoji).toBe("🙂");
    expect(moodFace(5)?.emoji).toBe("😄");
  });

  it("handles fractional averages", () => {
    expect(moodFace(2.5)?.emoji).toBe("😐");
    expect(moodFace(4.5)?.emoji).toBe("😄");
  });
});

describe("averageMood", () => {
  it("ignores nullish values", () => {
    expect(averageMood([null, undefined, 4])).toBe(4);
  });

  it("returns null when nothing is defined", () => {
    expect(averageMood([null, undefined])).toBeNull();
  });

  it("rounds to the nearest half", () => {
    expect(averageMood([4, 5])).toBe(4.5);
    expect(averageMood([2, 3, 3])).toBe(2.5);
  });
});
