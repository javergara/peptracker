import { describe, expect, it } from "vitest";

import { labStatus } from "./labs";

describe("labStatus", () => {
  it("returns no range when neither bound is set", () => {
    const r = labStatus(100, null, null);
    expect(r.hasRange).toBe(false);
  });

  it("flags in-range values as ok and centers the marker", () => {
    // Total testosterone ref 264–916, value 642 sits comfortably inside.
    const r = labStatus(642, 264, 916);
    expect(r.hasRange).toBe(true);
    expect(r.status).toBe("ok");
    expect(r.markerPct).toBeGreaterThan(45);
    expect(r.markerPct).toBeLessThan(65);
    // band is centered with 0.25R padding either side (~16.7%).
    expect(Math.round(r.bandLeftPct)).toBe(17);
    expect(Math.round(r.bandRightPct)).toBe(17);
  });

  it("marks a high-normal value as borderline", () => {
    // IGF-1 ref 88–246, value 241 is within range but near the top.
    const r = labStatus(241, 88, 246);
    expect(r.status).toBe("borderline");
  });

  it("marks an above-range value as bad", () => {
    const r = labStatus(122, null, 100); // LDL optimal < 100
    expect(r.status).toBe("bad");
    expect(r.bandLeftPct).toBe(0); // upper-bound-only band starts at 0
    expect(r.markerPct).toBeGreaterThan(50);
  });

  it("marks a below-range value as bad", () => {
    const r = labStatus(180, 264, 916); // testosterone below low bound
    expect(r.status).toBe("bad");
  });

  it("handles a lower-bound-only range (good is high)", () => {
    // HDL optimal > 40, value 71 is comfortably above.
    const r = labStatus(71, 40, null);
    expect(r.hasRange).toBe(true);
    expect(r.status).toBe("ok");
    expect(r.bandRightPct).toBe(0); // band runs to the right edge
  });

  it("clamps the marker for extreme out-of-range values", () => {
    const r = labStatus(5000, 264, 916);
    expect(r.markerPct).toBe(100);
    expect(r.status).toBe("bad");
  });
});
