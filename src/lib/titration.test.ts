import { describe, expect, it } from "vitest";

import {
  doseForCycleDay,
  parseWeekRange,
  protocolLabel,
  stepForWeek,
  type WeekRange,
} from "@/lib/titration";
import type { DosingProtocol, TitrationStep } from "@/types/peptide";

describe("parseWeekRange", () => {
  it("parses a hyphen range", () => {
    expect(parseWeekRange("1-4")).toEqual<WeekRange>({ start: 1, end: 4 });
  });

  it("parses an en-dash range", () => {
    expect(parseWeekRange("1–4")).toEqual<WeekRange>({ start: 1, end: 4 });
  });

  it("parses a single week", () => {
    expect(parseWeekRange("5")).toEqual<WeekRange>({ start: 5, end: 5 });
  });

  it("parses an open-ended week (13+)", () => {
    expect(parseWeekRange("13+")).toEqual<WeekRange>({ start: 13, end: null });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseWeekRange(" 1 - 4 ")).toEqual<WeekRange>({ start: 1, end: 4 });
  });

  it("returns a never-matching range for unparseable input", () => {
    const range = parseWeekRange("whenever");
    expect(range.end).not.toBeNull();
    expect(
      stepForWeek([{ weeks: "whenever", amount: 1, unit: "mcg" }], 1),
    ).toBeNull();
  });
});

const RAMP_STEPS: TitrationStep[] = [
  { weeks: "1-4", amount: 0.25, unit: "mg", note: "Titration start" },
  { weeks: "5-8", amount: 0.5, unit: "mg" },
  { weeks: "9-12", amount: 1, unit: "mg" },
  { weeks: "13+", amount: 2, unit: "mg", note: "Maintenance" },
];

describe("stepForWeek", () => {
  it("matches the correct step across a multi-step ramp", () => {
    expect(stepForWeek(RAMP_STEPS, 1)?.amount).toBe(0.25);
    expect(stepForWeek(RAMP_STEPS, 4)?.amount).toBe(0.25);
    expect(stepForWeek(RAMP_STEPS, 5)?.amount).toBe(0.5);
    expect(stepForWeek(RAMP_STEPS, 9)?.amount).toBe(1);
  });

  it("matches an open-ended last step indefinitely", () => {
    expect(stepForWeek(RAMP_STEPS, 13)?.amount).toBe(2);
    expect(stepForWeek(RAMP_STEPS, 52)?.amount).toBe(2);
  });

  it("returns null when the week is out of range (before the first step)", () => {
    expect(
      stepForWeek([{ weeks: "5-8", amount: 1, unit: "mg" }], 1),
    ).toBeNull();
  });

  it("returns null for an empty step list", () => {
    expect(stepForWeek([], 1)).toBeNull();
  });
});

describe("doseForCycleDay", () => {
  const protocol: DosingProtocol = { label: "Standard", steps: RAMP_STEPS };
  const startDate = new Date("2026-01-01T00:00:00Z");

  it("returns the first step's dose on the start date (week 1)", () => {
    const result = doseForCycleDay(protocol, startDate, startDate);
    expect(result).toMatchObject({
      amount: 0.25,
      unit: "mg",
      weekNumber: 1,
      stepLabel: "1-4",
      note: "Titration start",
    });
  });

  it("stays in week 1 on day 7 since start (6 days elapsed)", () => {
    const day7 = new Date("2026-01-07T00:00:00Z");
    const result = doseForCycleDay(protocol, startDate, day7);
    expect(result?.weekNumber).toBe(1);
    expect(result?.amount).toBe(0.25);
  });

  it("advances to week 2 on day 8 since start (7 days elapsed)", () => {
    const day8 = new Date("2026-01-08T00:00:00Z");
    const result = doseForCycleDay(protocol, startDate, day8);
    expect(result?.weekNumber).toBe(2);
  });

  it("advances the ramp across step boundaries", () => {
    const week5 = new Date("2026-01-29T00:00:00Z"); // day 29 -> daysSince 28 -> week 5
    const result = doseForCycleDay(protocol, startDate, week5);
    expect(result?.weekNumber).toBe(5);
    expect(result?.amount).toBe(0.5);
  });

  it("resolves the open-ended final step far into the cycle", () => {
    const farOut = new Date("2026-06-01T00:00:00Z");
    const result = doseForCycleDay(protocol, startDate, farOut);
    expect(result?.amount).toBe(2);
    expect(result?.note).toBe("Maintenance");
  });

  it("returns null when the date precedes the cycle start", () => {
    const before = new Date("2025-12-31T00:00:00Z");
    expect(doseForCycleDay(protocol, startDate, before)).toBeNull();
  });

  it("returns null when no step covers the computed week", () => {
    const gapProtocol: DosingProtocol = {
      steps: [{ weeks: "5-8", amount: 1, unit: "mg" }],
    };
    expect(doseForCycleDay(gapProtocol, startDate, startDate)).toBeNull();
  });

  it("handles en-dash week labels the same as hyphens", () => {
    const enDashProtocol: DosingProtocol = {
      steps: [{ weeks: "1–4", amount: 3, unit: "mcg" }],
    };
    const result = doseForCycleDay(enDashProtocol, startDate, startDate);
    expect(result).toMatchObject({ amount: 3, unit: "mcg", weekNumber: 1 });
  });
});

describe("protocolLabel", () => {
  it("uses the protocol's own label when set", () => {
    expect(protocolLabel({ label: "Aggressive", steps: [] }, 0)).toBe(
      "Aggressive",
    );
  });

  it("falls back to a positional label when unset", () => {
    expect(protocolLabel({ steps: [] }, 0)).toBe("Protocol 1");
    expect(protocolLabel({ steps: [] }, 2)).toBe("Protocol 3");
  });

  it("falls back when label is blank/whitespace", () => {
    expect(protocolLabel({ label: "   ", steps: [] }, 1)).toBe("Protocol 2");
  });
});
