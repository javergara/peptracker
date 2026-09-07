import { describe, expect, it } from "vitest";

import {
  groupStudiesByStatus,
  studyDate,
  isFollowUpDue,
  type StudyLike,
} from "@/lib/studies";

function make(overrides: Partial<StudyLike> = {}): StudyLike {
  return {
    status: "completed",
    performedAt: null,
    followUpAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("groupStudiesByStatus", () => {
  it("orders groups scheduled → follow-up → completed and drops empties", () => {
    const groups = groupStudiesByStatus([
      { status: "completed" },
      { status: "scheduled" },
      { status: "follow-up" },
      { status: "completed" },
    ]);
    expect(groups.map((g) => g.status)).toEqual([
      "scheduled",
      "follow-up",
      "completed",
    ]);
    expect(groups.find((g) => g.status === "completed")!.items).toHaveLength(2);
  });

  it("normalizes unknown status into completed", () => {
    const groups = groupStudiesByStatus([{ status: "garbage" }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("completed");
  });

  it("returns empty for no studies", () => {
    expect(groupStudiesByStatus([])).toEqual([]);
  });
});

describe("studyDate", () => {
  it("prefers performedAt, then followUpAt, then createdAt", () => {
    const performed = new Date("2026-05-01T00:00:00Z");
    const followUp = new Date("2026-06-01T00:00:00Z");
    const created = new Date("2026-01-01T00:00:00Z");
    expect(
      studyDate(
        make({
          performedAt: performed,
          followUpAt: followUp,
          createdAt: created,
        }),
      ),
    ).toBe(performed);
    expect(studyDate(make({ followUpAt: followUp, createdAt: created }))).toBe(
      followUp,
    );
    expect(studyDate(make({ createdAt: created }))).toBe(created);
  });
});

describe("isFollowUpDue", () => {
  const now = new Date("2026-09-07T12:00:00Z");

  it("is due when follow-up date has passed", () => {
    expect(
      isFollowUpDue(
        make({
          status: "follow-up",
          followUpAt: new Date("2026-09-01T00:00:00Z"),
        }),
        now,
      ),
    ).toBe(true);
  });

  it("is not due for future follow-up dates", () => {
    expect(
      isFollowUpDue(
        make({
          status: "scheduled",
          followUpAt: new Date("2026-12-01T00:00:00Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("is never due for completed studies", () => {
    expect(
      isFollowUpDue(
        make({
          status: "completed",
          followUpAt: new Date("2026-01-01T00:00:00Z"),
        }),
        now,
      ),
    ).toBe(false);
  });

  it("is not due without a follow-up date", () => {
    expect(
      isFollowUpDue(make({ status: "follow-up", followUpAt: null }), now),
    ).toBe(false);
  });
});
