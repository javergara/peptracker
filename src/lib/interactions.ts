/**
 * Peptide-interaction lookup: from a flat list of pairwise interaction rows,
 * find those relevant to a selected set of peptides and report the most severe
 * interaction kind present. Pure functions — no DB.
 */

export interface InteractionRow {
  peptideAId: string;
  peptideBId: string;
  kind: string;
  note: string;
}

/**
 * Return the interaction rows where BOTH peptides are in `selectedIds`.
 */
export function findInteractions(
  selectedIds: string[],
  rows: InteractionRow[],
): InteractionRow[] {
  const selected = new Set(selectedIds);
  return rows.filter(
    (row) => selected.has(row.peptideAId) && selected.has(row.peptideBId),
  );
}

/**
 * Severity ranking for interaction kinds: lower number = more severe.
 */
export const SEVERITY_ORDER: Record<string, number> = {
  avoid: 0,
  caution: 1,
  synergy: 2,
};

/**
 * Return the most severe interaction kind present among `rows`
 * (avoid > caution > synergy), or `null` when there are no rows.
 * Unknown kinds are ignored.
 */
export function worstKind(
  rows: { kind: string }[],
): "avoid" | "caution" | "synergy" | null {
  let worst: "avoid" | "caution" | "synergy" | null = null;
  let worstRank = Infinity;

  for (const row of rows) {
    const rank = SEVERITY_ORDER[row.kind];
    if (rank === undefined) continue;
    if (rank < worstRank) {
      worstRank = rank;
      worst = row.kind as "avoid" | "caution" | "synergy";
    }
  }

  return worst;
}
