import { describe, expect, it } from "vitest";

import {
  cycleProgress,
  getTodaysDoses,
  isDoseDay,
  type CycleLike,
  type ScheduleConfig,
} from "@/lib/schedule";

// A known Sunday for stable weekday math.
const SUNDAY = new Date(2026, 5, 14); // 2026-06-14 is a Sunday (getDay() === 0)

describe("isDoseDay", () => {
  it("daily is always true", () => {
    const config: ScheduleConfig = { frequency: "daily" };
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(true);
    expect(isDoseDay(config, new Date(2026, 5, 20), SUNDAY)).toBe(true);
  });

  it("eod is true on start and every other day", () => {
    const config: ScheduleConfig = { frequency: "eod" };
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(true); // day 0
    expect(isDoseDay(config, new Date(2026, 5, 15), SUNDAY)).toBe(false); // day 1
    expect(isDoseDay(config, new Date(2026, 5, 16), SUNDAY)).toBe(true); // day 2
    expect(isDoseDay(config, new Date(2026, 5, 17), SUNDAY)).toBe(false); // day 3
  });

  it("weekly matches the start weekday by default", () => {
    const config: ScheduleConfig = { frequency: "weekly" };
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(true);
    expect(isDoseDay(config, new Date(2026, 5, 21), SUNDAY)).toBe(true); // next Sunday
    expect(isDoseDay(config, new Date(2026, 5, 15), SUNDAY)).toBe(false); // Monday
  });

  it("weekly can override the weekday via daysOfWeek[0]", () => {
    const config: ScheduleConfig = { frequency: "weekly", daysOfWeek: [3] }; // Wed
    expect(isDoseDay(config, new Date(2026, 5, 17), SUNDAY)).toBe(true); // Wed
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(false); // Sun
  });

  it("twice-weekly / custom use daysOfWeek membership", () => {
    const twice: ScheduleConfig = {
      frequency: "twice-weekly",
      daysOfWeek: [1, 4], // Mon, Thu
    };
    expect(isDoseDay(twice, new Date(2026, 5, 15), SUNDAY)).toBe(true); // Mon
    expect(isDoseDay(twice, new Date(2026, 5, 18), SUNDAY)).toBe(true); // Thu
    expect(isDoseDay(twice, new Date(2026, 5, 16), SUNDAY)).toBe(false); // Tue

    const custom: ScheduleConfig = { frequency: "custom", daysOfWeek: [0] };
    expect(isDoseDay(custom, SUNDAY, SUNDAY)).toBe(true);
    expect(isDoseDay(custom, new Date(2026, 5, 15), SUNDAY)).toBe(false);
  });

  it("custom with no daysOfWeek matches nothing", () => {
    const config: ScheduleConfig = { frequency: "custom" };
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(false);
  });

  it("defaults to true for an unknown frequency", () => {
    const config = { frequency: "monthly" } as unknown as ScheduleConfig;
    expect(isDoseDay(config, SUNDAY, SUNDAY)).toBe(true);
  });
});

function makeCycle(overrides: Partial<CycleLike> = {}): CycleLike {
  return {
    id: "c1",
    name: "Test cycle",
    startDate: SUNDAY,
    endDate: new Date(2026, 6, 14),
    status: "active",
    scheduleConfig: { frequency: "daily", timesPerDay: 1 },
    ...overrides,
  };
}

describe("getTodaysDoses", () => {
  it("includes active, in-range, dose-day cycles with times", () => {
    const cycle = makeCycle({
      scheduleConfig: { frequency: "daily", timesPerDay: 2 },
    });
    const result = getTodaysDoses([cycle], SUNDAY);
    expect(result).toEqual([{ cycle, times: 2 }]);
  });

  it("defaults times to 1 when timesPerDay is absent", () => {
    const cycle = makeCycle({ scheduleConfig: { frequency: "daily" } });
    expect(getTodaysDoses([cycle], SUNDAY)[0].times).toBe(1);
  });

  it("excludes non-active cycles", () => {
    const cycle = makeCycle({ status: "paused" });
    expect(getTodaysDoses([cycle], SUNDAY)).toEqual([]);
  });

  it("excludes cycles out of date range", () => {
    const cycle = makeCycle({
      startDate: new Date(2026, 5, 20),
      endDate: new Date(2026, 5, 30),
    });
    expect(getTodaysDoses([cycle], SUNDAY)).toEqual([]);
  });

  it("excludes cycles without a schedule config", () => {
    const cycle = makeCycle({ scheduleConfig: null });
    expect(getTodaysDoses([cycle], SUNDAY)).toEqual([]);
  });

  it("excludes cycles when it is not a dose day", () => {
    const cycle = makeCycle({
      scheduleConfig: { frequency: "eod" },
      startDate: new Date(2026, 5, 13), // day 1 from SUNDAY -> not a dose day
    });
    expect(getTodaysDoses([cycle], SUNDAY)).toEqual([]);
  });
});

describe("cycleProgress", () => {
  it("computes elapsed, total and percent", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 11);
    const now = new Date(2026, 0, 6);
    expect(cycleProgress(start, end, now)).toEqual({
      daysElapsed: 5,
      totalDays: 10,
      percent: 50,
    });
  });

  it("clamps percent at 100 when past the end", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 11);
    const now = new Date(2026, 0, 31);
    const p = cycleProgress(start, end, now);
    expect(p.percent).toBe(100);
  });

  it("never returns a negative daysElapsed", () => {
    const start = new Date(2026, 0, 10);
    const end = new Date(2026, 0, 20);
    const now = new Date(2026, 0, 1);
    expect(cycleProgress(start, end, now).daysElapsed).toBe(0);
  });

  it("returns null total and percent for open-ended cycles", () => {
    const start = new Date(2026, 0, 1);
    const now = new Date(2026, 0, 6);
    expect(cycleProgress(start, null, now)).toEqual({
      daysElapsed: 5,
      totalDays: null,
      percent: null,
    });
  });
});
