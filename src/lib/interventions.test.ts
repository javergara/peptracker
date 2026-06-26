import { describe, expect, it } from "vitest";

import {
  buildInterventionBands,
  type InterventionInput,
} from "./interventions";

const d = (s: string) => new Date(s);

describe("buildInterventionBands", () => {
  const items: InterventionInput[] = [
    {
      id: "a",
      label: "Retatrutide",
      kind: "cycle",
      start: d("2026-01-01"),
      end: d("2026-03-01"),
    },
    {
      id: "b",
      label: "Omega-3",
      kind: "supplement",
      start: d("2026-02-01"),
      end: null, // ongoing
    },
    {
      id: "c",
      label: "Last year",
      kind: "cycle",
      start: d("2025-01-01"),
      end: d("2025-02-01"),
    },
  ];

  const start = d("2026-01-15");
  const end = d("2026-04-01");

  it("keeps overlapping bands, drops non-overlapping, sorts by start", () => {
    const bands = buildInterventionBands(items, start, end);
    expect(bands.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("treats a null end as ongoing through the window", () => {
    const bands = buildInterventionBands([items[1]], start, end);
    expect(bands).toHaveLength(1);
    expect(bands[0].id).toBe("b");
  });

  it("excludes a band entirely before the window", () => {
    const bands = buildInterventionBands([items[2]], start, end);
    expect(bands).toHaveLength(0);
  });
});
