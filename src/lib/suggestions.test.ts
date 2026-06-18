import { describe, expect, it } from "vitest";

import {
  suggestByGoal,
  type SuggestPeptide,
  type SuggestStack,
} from "@/lib/suggestions";

const peptides: SuggestPeptide[] = [
  {
    slug: "tirzepatide",
    name: "Tirzepatide",
    tags: ["fat-loss", "metabolic"],
    category: "GLP_GIP",
  },
  {
    slug: "aod-9604",
    name: "AOD-9604",
    tags: ["Fat-Loss"], // mixed case to exercise case-insensitivity
    category: "GH_SECRETAGOGUE",
  },
  {
    slug: "bpc-157",
    name: "BPC-157",
    tags: ["recovery-injury"],
    category: "HEALING_REPAIR",
  },
];

const stacks: SuggestStack[] = [
  {
    slug: "cutting-stack",
    name: "Cutting Stack",
    tags: ["fat-loss"],
    goal: "fat-loss",
  },
  {
    slug: "repair-stack",
    name: "Repair Stack",
    tags: ["recovery-injury"],
    goal: "recovery-injury",
  },
];

describe("suggestByGoal", () => {
  it("filters peptides by tag (case-insensitive) and sorts by name", () => {
    const { peptides: result } = suggestByGoal("fat-loss", peptides, stacks);
    expect(result.map((p) => p.slug)).toEqual(["aod-9604", "tirzepatide"]);
  });

  it("filters stacks by tag", () => {
    const { stacks: result } = suggestByGoal("fat-loss", peptides, stacks);
    expect(result.map((s) => s.slug)).toEqual(["cutting-stack"]);
  });

  it("matches a different goal", () => {
    const result = suggestByGoal("recovery-injury", peptides, stacks);
    expect(result.peptides.map((p) => p.slug)).toEqual(["bpc-157"]);
    expect(result.stacks.map((s) => s.slug)).toEqual(["repair-stack"]);
  });

  it("returns empty arrays when nothing matches", () => {
    const result = suggestByGoal("sleep", peptides, stacks);
    expect(result.peptides).toEqual([]);
    expect(result.stacks).toEqual([]);
  });

  it("handles empty inputs", () => {
    expect(suggestByGoal("fat-loss", [], [])).toEqual({
      peptides: [],
      stacks: [],
    });
  });
});
