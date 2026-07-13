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

import { suggestByGoals } from "@/lib/suggestions";

describe("suggestByGoals", () => {
  const multi: SuggestPeptide[] = [
    {
      slug: "reta",
      name: "Retatrutide",
      tags: ["fat-loss", "metabolic"],
      category: "GLP_GIP",
      referenceCount: 6,
    },
    {
      slug: "aod",
      name: "AOD-9604",
      tags: ["fat-loss"],
      category: "GH_SECRETAGOGUE",
      referenceCount: 2,
    },
    {
      slug: "bpc",
      name: "BPC-157",
      tags: ["recovery-injury"],
      category: "HEALING_REPAIR",
    },
  ];

  it("ranks items covering more of the selected goals first", () => {
    const { peptides } = suggestByGoals(["fat-loss", "metabolic"], multi, []);
    // Reta matches BOTH goals → outranks single-goal AOD; BPC matches neither.
    expect(peptides.map((p) => p.slug)).toEqual(["reta", "aod"]);
    expect(peptides[0].matchedGoals).toEqual(["fat-loss", "metabolic"]);
  });

  it("breaks ties by evidence depth (reference count)", () => {
    const a: SuggestPeptide = {
      slug: "a",
      name: "Aaa",
      tags: ["fat-loss"],
      category: "X",
      referenceCount: 1,
    };
    const b: SuggestPeptide = {
      slug: "b",
      name: "Bbb",
      tags: ["fat-loss"],
      category: "X",
      referenceCount: 7,
    };
    const { peptides } = suggestByGoals(["fat-loss"], [a, b], []);
    // Same goal coverage, but b has more references → ranks first despite name.
    expect(peptides.map((p) => p.slug)).toEqual(["b", "a"]);
  });

  it("boosts a peptide the user already owns", () => {
    const owned: SuggestPeptide = {
      slug: "owned",
      name: "Zzz",
      tags: ["fat-loss"],
      category: "X",
      owned: true,
    };
    const other: SuggestPeptide = {
      slug: "other",
      name: "Aaa",
      tags: ["fat-loss"],
      category: "X",
    };
    const { peptides } = suggestByGoals(["fat-loss"], [owned, other], []);
    expect(peptides[0].slug).toBe("owned");
  });

  it("counts a stack's own goal field toward coverage", () => {
    const stacks: SuggestStack[] = [
      { slug: "s", name: "S", tags: [], goal: "fat-loss" },
    ];
    const { stacks: result } = suggestByGoals(["fat-loss"], [], stacks);
    expect(result.map((s) => s.slug)).toEqual(["s"]);
  });

  it("returns empty for no goals", () => {
    expect(suggestByGoals([], multi, [])).toEqual({ peptides: [], stacks: [] });
  });
});
