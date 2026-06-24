import { describe, expect, it } from "vitest";

import { INJECTION_SITES, suggestNextSite } from "./sites";

describe("suggestNextSite", () => {
  it("starts at the first site when nothing used", () => {
    expect(suggestNextSite(null)).toBe(INJECTION_SITES[0]);
    expect(suggestNextSite(undefined)).toBe(INJECTION_SITES[0]);
  });

  it("advances to the next site in the rotation", () => {
    expect(suggestNextSite(INJECTION_SITES[0])).toBe(INJECTION_SITES[1]);
    expect(suggestNextSite(INJECTION_SITES[1])).toBe(INJECTION_SITES[2]);
  });

  it("wraps around at the end", () => {
    const last = INJECTION_SITES[INJECTION_SITES.length - 1];
    expect(suggestNextSite(last)).toBe(INJECTION_SITES[0]);
  });

  it("falls back to first for an unknown site", () => {
    expect(suggestNextSite("Nowhere")).toBe(INJECTION_SITES[0]);
  });
});
