import type { GoalTag } from "@/types/peptide";

/**
 * Rule-based suggestion engine: given a user goal, pick the peptides and stacks
 * whose tags match that goal. Pure data filtering — no DB access.
 */

export interface SuggestPeptide {
  slug: string;
  name: string;
  tags: string[];
  category: string;
  summary?: string;
}

export interface SuggestStack {
  slug: string;
  name: string;
  tags: string[];
  goal: string | null;
}

/**
 * Suggest peptides and stacks for a goal.
 *
 * Matching is case-insensitive on tags. Peptides are returned sorted by name;
 * stacks keep input order. When nothing matches, both arrays are empty.
 */
export function suggestByGoal(
  goal: GoalTag,
  peptides: SuggestPeptide[],
  stacks: SuggestStack[],
): { peptides: SuggestPeptide[]; stacks: SuggestStack[] } {
  const needle = goal.toLowerCase();

  const hasTag = (tags: string[]): boolean =>
    tags.some((tag) => tag.toLowerCase() === needle);

  const matchedPeptides = peptides
    .filter((p) => hasTag(p.tags))
    .sort((a, b) => a.name.localeCompare(b.name));

  const matchedStacks = stacks.filter((s) => hasTag(s.tags));

  return { peptides: matchedPeptides, stacks: matchedStacks };
}
