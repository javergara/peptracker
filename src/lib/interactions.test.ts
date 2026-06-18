import { describe, expect, it } from "vitest";

import {
  findInteractions,
  SEVERITY_ORDER,
  worstKind,
  type InteractionRow,
} from "@/lib/interactions";

const rows: InteractionRow[] = [
  { peptideAId: "a", peptideBId: "b", kind: "synergy", note: "a+b" },
  { peptideAId: "a", peptideBId: "c", kind: "caution", note: "a+c" },
  { peptideAId: "b", peptideBId: "d", kind: "avoid", note: "b+d" },
];

describe("findInteractions", () => {
  it("returns only rows where both peptides are selected", () => {
    const result = findInteractions(["a", "b", "c"], rows);
    expect(result.map((r) => r.note)).toEqual(["a+b", "a+c"]);
  });

  it("excludes rows where only one peptide is selected", () => {
    const result = findInteractions(["a", "d"], rows);
    expect(result).toEqual([]);
  });

  it("returns empty for an empty selection", () => {
    expect(findInteractions([], rows)).toEqual([]);
  });

  it("returns empty when there are no rows", () => {
    expect(findInteractions(["a", "b"], [])).toEqual([]);
  });
});

describe("SEVERITY_ORDER", () => {
  it("ranks avoid most severe, synergy least", () => {
    expect(SEVERITY_ORDER.avoid).toBe(0);
    expect(SEVERITY_ORDER.caution).toBe(1);
    expect(SEVERITY_ORDER.synergy).toBe(2);
  });
});

describe("worstKind", () => {
  it("returns null for an empty list", () => {
    expect(worstKind([])).toBeNull();
  });

  it("picks avoid over caution and synergy", () => {
    expect(
      worstKind([{ kind: "synergy" }, { kind: "avoid" }, { kind: "caution" }]),
    ).toBe("avoid");
  });

  it("picks caution over synergy", () => {
    expect(worstKind([{ kind: "synergy" }, { kind: "caution" }])).toBe(
      "caution",
    );
  });

  it("returns synergy when it is the only kind", () => {
    expect(worstKind([{ kind: "synergy" }])).toBe("synergy");
  });

  it("ignores unknown kinds", () => {
    expect(worstKind([{ kind: "mystery" }])).toBeNull();
    expect(worstKind([{ kind: "mystery" }, { kind: "caution" }])).toBe(
      "caution",
    );
  });
});
