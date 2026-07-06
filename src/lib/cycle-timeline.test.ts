import { describe, expect, it } from "vitest";

import {
  buildCycleLanes,
  type CycleTimelineCycle,
  type CycleTimelineDoseLog,
} from "./cycle-timeline";

const d = (s: string) => new Date(s);

const FROM = d("2026-01-01");
const TO = d("2026-06-01");
const NOW = d("2026-03-01");

function makeCycle(
  overrides: Partial<CycleTimelineCycle> = {},
): CycleTimelineCycle {
  return {
    id: "c1",
    name: "Test cycle",
    status: "active",
    startDate: d("2026-02-01"),
    endDate: d("2026-04-01"),
    peptideId: "p1",
    peptide: { id: "p1", name: "Retatrutide" },
    scheduleConfig: { frequency: "daily" },
    ...overrides,
  };
}

describe("buildCycleLanes", () => {
  it("contributes one segment for a single-peptide cycle", () => {
    const lanes = buildCycleLanes({
      cycles: [makeCycle()],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes).toHaveLength(1);
    expect(lanes[0].peptideId).toBe("p1");
    expect(lanes[0].peptideName).toBe("Retatrutide");
    expect(lanes[0].segments).toHaveLength(1);
    expect(lanes[0].segments[0]).toMatchObject({
      cycleId: "c1",
      cycleName: "Test cycle",
      start: d("2026-02-01").getTime(),
      end: d("2026-04-01").getTime(),
      status: "active",
    });
  });

  it("fans a stack cycle out to per-peptide segments using resolved sub-ranges", () => {
    const cycle = makeCycle({
      id: "stack1",
      name: "Stack cycle",
      peptideId: null,
      peptide: null,
      stack: {
        items: [
          { peptide: { id: "pa", name: "Peptide A" } },
          { peptide: { id: "pb", name: "Peptide B" } },
        ],
      },
      startDate: d("2026-02-01"),
      endDate: d("2026-05-01"),
      scheduleConfig: {
        frequency: "daily",
        items: [
          { peptideId: "pa" }, // uses cycle-level start/end
          {
            peptideId: "pb",
            startDate: "2026-02-15",
            endDate: "2026-03-15",
          },
        ],
      },
    });
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes).toHaveLength(2);
    const laneA = lanes.find((l) => l.peptideId === "pa")!;
    const laneB = lanes.find((l) => l.peptideId === "pb")!;
    expect(laneA.segments[0]).toMatchObject({
      start: d("2026-02-01").getTime(),
      end: d("2026-05-01").getTime(),
    });
    expect(laneB.segments[0]).toMatchObject({
      start: d("2026-02-15").getTime(),
      end: d("2026-03-15").getTime(),
    });
  });

  it("clips an open-ended active cycle's end to the window's `to`", () => {
    const cycle = makeCycle({ endDate: null });
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes[0].segments[0].end).toBe(TO.getTime());
    expect(lanes[0].segments[0].projectedEnd).toBeNull();
  });

  it("sets projectedEnd for an active cycle whose configured end is in the future", () => {
    const cycle = makeCycle({
      status: "active",
      startDate: d("2026-02-01"),
      endDate: d("2026-05-01"), // in the future relative to NOW (2026-03-01)
    });
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    const seg = lanes[0].segments[0];
    expect(seg.projectedEnd).toBe(d("2026-05-01").getTime());
    expect(seg.isProjected).toBe(true);
  });

  it("does not project a completed cycle's future-looking end date", () => {
    const cycle = makeCycle({ status: "completed", endDate: d("2026-05-01") });
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes[0].segments[0].projectedEnd).toBeNull();
  });

  it("creates a fallback 'logged' lane for a peptide with doses but no covering cycle", () => {
    const doseLogs: CycleTimelineDoseLog[] = [
      {
        peptideId: "loose",
        peptide: { name: "Loose Peptide" },
        takenAt: d("2026-01-10"),
        cycleId: null,
      },
      {
        peptideId: "loose",
        peptide: { name: "Loose Peptide" },
        takenAt: d("2026-01-20"),
        cycleId: null,
      },
    ];
    const lanes = buildCycleLanes({
      cycles: [],
      doseLogs,
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes).toHaveLength(1);
    expect(lanes[0].peptideId).toBe("loose");
    expect(lanes[0].segments).toEqual([
      {
        cycleId: null,
        cycleName: "Loose Peptide",
        start: d("2026-01-10").getTime(),
        end: d("2026-01-20").getTime(),
        projectedEnd: null,
        status: "logged",
        isProjected: false,
      },
    ]);
    expect(lanes[0].doseTimes).toEqual([
      d("2026-01-10").getTime(),
      d("2026-01-20").getTime(),
    ]);
  });

  it("attaches dose times to an existing cycle-covered lane instead of duplicating it", () => {
    const cycle = makeCycle();
    const doseLogs: CycleTimelineDoseLog[] = [
      {
        peptideId: "p1",
        peptide: { name: "Retatrutide" },
        takenAt: d("2026-02-10"),
        cycleId: "c1",
      },
    ];
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs,
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes).toHaveLength(1);
    expect(lanes[0].segments).toHaveLength(1);
    expect(lanes[0].doseTimes).toEqual([d("2026-02-10").getTime()]);
  });

  it("clips segments and dose times to the [from, to] window", () => {
    const cycle = makeCycle({
      startDate: d("2025-06-01"),
      endDate: d("2026-08-01"),
    });
    const doseLogs: CycleTimelineDoseLog[] = [
      {
        peptideId: "p1",
        peptide: { name: "Retatrutide" },
        takenAt: d("2025-12-01"), // outside window
        cycleId: "c1",
      },
      {
        peptideId: "p1",
        peptide: { name: "Retatrutide" },
        takenAt: d("2026-02-01"), // inside window
        cycleId: "c1",
      },
    ];
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs,
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes[0].segments[0].start).toBe(FROM.getTime());
    expect(lanes[0].segments[0].end).toBe(TO.getTime());
    expect(lanes[0].doseTimes).toEqual([d("2026-02-01").getTime()]);
  });

  it("excludes a cycle whose range falls entirely outside the window", () => {
    const cycle = makeCycle({
      startDate: d("2020-01-01"),
      endDate: d("2020-06-01"),
    });
    const lanes = buildCycleLanes({
      cycles: [cycle],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes).toEqual([]);
  });

  it("sorts lanes by earliest segment start", () => {
    const early = makeCycle({
      id: "early",
      peptideId: "later-peptide",
      peptide: { id: "later-peptide", name: "Later Peptide" },
      startDate: d("2026-04-01"),
      endDate: d("2026-05-01"),
    });
    const late = makeCycle({
      id: "late",
      peptideId: "earlier-peptide",
      peptide: { id: "earlier-peptide", name: "Earlier Peptide" },
      startDate: d("2026-01-15"),
      endDate: d("2026-02-15"),
    });
    const lanes = buildCycleLanes({
      cycles: [early, late],
      doseLogs: [],
      from: FROM,
      to: TO,
      now: NOW,
    });
    expect(lanes.map((l) => l.peptideId)).toEqual([
      "earlier-peptide",
      "later-peptide",
    ]);
  });
});
