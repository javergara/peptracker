import { describe, expect, it } from "vitest";

import { vialFillPercent, vialGaugeStatus } from "./vials";

describe("vialFillPercent", () => {
  it("computes a clamped 0–100 percent", () => {
    expect(vialFillPercent(8640, 12000)).toBe(72);
    expect(vialFillPercent(0, 5000)).toBe(0);
    expect(vialFillPercent(6000, 5000)).toBe(100); // clamps over 100
  });
  it("guards a zero total", () => {
    expect(vialFillPercent(100, 0)).toBe(0);
  });
});

describe("vialGaugeStatus", () => {
  const now = new Date("2026-06-24T12:00:00Z");

  it("maps stored statuses straight through", () => {
    expect(vialGaugeStatus({ status: "sealed" }, now)).toBe("sealed");
    expect(vialGaugeStatus({ status: "empty" }, now)).toBe("empty");
    expect(vialGaugeStatus({ status: "expired" }, now)).toBe("expired");
  });

  it("flags an active vial expiring within 7 days as soon", () => {
    expect(
      vialGaugeStatus(
        { status: "active", expiresAt: new Date("2026-06-28T12:00:00Z") },
        now,
      ),
    ).toBe("soon");
  });

  it("keeps a healthy active vial active", () => {
    expect(
      vialGaugeStatus(
        { status: "active", expiresAt: new Date("2026-08-14T12:00:00Z") },
        now,
      ),
    ).toBe("active");
    expect(vialGaugeStatus({ status: "active" }, now)).toBe("active");
  });
});
