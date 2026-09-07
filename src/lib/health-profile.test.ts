import { describe, expect, it } from "vitest";

import {
  groupConditionsByStatus,
  summarizeFamilyHistory,
} from "@/lib/health-profile";

describe("groupConditionsByStatus", () => {
  it("orders groups active → monitoring → resolved and omits empty ones", () => {
    const groups = groupConditionsByStatus([
      { status: "resolved", name: "Old thing" },
      { status: "active", name: "Dyslipidemia" },
      { status: "monitoring", name: "Elevated transaminases" },
      { status: "active", name: "Migraine" },
    ]);
    expect(groups.map((g) => g.status)).toEqual([
      "active",
      "monitoring",
      "resolved",
    ]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].label).toBe("Active");
  });

  it("omits statuses with no items", () => {
    const groups = groupConditionsByStatus([{ status: "active", name: "A" }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("active");
  });

  it("treats unknown status values as active", () => {
    const groups = groupConditionsByStatus([
      { status: "bogus", name: "Weird" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].status).toBe("active");
    expect(groups[0].items[0].name).toBe("Weird");
  });

  it("returns empty for no conditions", () => {
    expect(groupConditionsByStatus([])).toEqual([]);
  });
});

describe("summarizeFamilyHistory", () => {
  it("groups by relative in fixed order, omitting empty groups", () => {
    const groups = summarizeFamilyHistory([
      { relative: "mother", condition: "Asthma" },
      { relative: "father", condition: "Diabetes" },
      { relative: "father", condition: "Hypertension" },
      { relative: "grandparent", condition: "Brain cancer" },
    ]);
    expect(groups.map((g) => g.relative)).toEqual([
      "father",
      "mother",
      "grandparent",
    ]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].label).toBe("Father");
  });

  it("falls back unknown relatives to other", () => {
    const groups = summarizeFamilyHistory([
      { relative: "cousin", condition: "X" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].relative).toBe("other");
  });

  it("returns empty for no entries", () => {
    expect(summarizeFamilyHistory([])).toEqual([]);
  });
});
