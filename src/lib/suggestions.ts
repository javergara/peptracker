import type { GoalTag } from "@/types/peptide";

/**
 * Rule-based suggestion engine (pure, no DB): given one or more goals, rank the
 * peptides and stacks whose tags cover those goals. Ranking blends **goal
 * coverage** (how many of the selected goals an item matches), **evidence depth**
 * (reference count, a proxy for how well-studied it is), and **actionability**
 * (a small boost for compounds the user already owns / is cycling), so the most
 * relevant, best-supported, ready-to-use options surface first.
 */

export interface SuggestPeptide {
  slug: string;
  name: string;
  tags: string[];
  category: string;
  summary?: string;
  /** Number of cited references (evidence-depth signal). */
  referenceCount?: number;
  /** True when the active profile already has this peptide in inventory/a cycle. */
  owned?: boolean;
}

export interface SuggestStack {
  slug: string;
  name: string;
  tags: string[];
  goal: string | null;
}

export interface ScoredPeptide extends SuggestPeptide {
  score: number;
  /** The selected goals this item matched (lower-cased). */
  matchedGoals: string[];
}

export interface ScoredStack extends SuggestStack {
  score: number;
  matchedGoals: string[];
}

// Weights — goal coverage dominates; evidence and ownership break ties.
const GOAL_MATCH_WEIGHT = 100;
const REFERENCE_WEIGHT = 2;
const REFERENCE_CAP = 8;
const OWNED_BOOST = 15;
const STACK_GOAL_FIELD_BONUS = 40;

/** Case-insensitive intersection of an item's tags with the selected goals. */
function matchedGoalsFor(tags: string[], goals: string[]): string[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return goals.map((g) => g.toLowerCase()).filter((g) => tagSet.has(g));
}

/**
 * Rank peptides and stacks against one or more goals. Items matching none of the
 * goals are dropped; the rest are sorted by score (desc), then name (asc).
 */
export function suggestByGoals(
  goals: GoalTag[],
  peptides: SuggestPeptide[],
  stacks: SuggestStack[],
): { peptides: ScoredPeptide[]; stacks: ScoredStack[] } {
  const goalKeys = goals.map((g) => g.toLowerCase());
  if (goalKeys.length === 0) return { peptides: [], stacks: [] };

  const scoredPeptides: ScoredPeptide[] = [];
  for (const p of peptides) {
    const matchedGoals = matchedGoalsFor(p.tags, goalKeys);
    if (matchedGoals.length === 0) continue;
    const score =
      matchedGoals.length * GOAL_MATCH_WEIGHT +
      Math.min(p.referenceCount ?? 0, REFERENCE_CAP) * REFERENCE_WEIGHT +
      (p.owned ? OWNED_BOOST : 0);
    scoredPeptides.push({ ...p, score, matchedGoals });
  }

  const scoredStacks: ScoredStack[] = [];
  for (const s of stacks) {
    const matchedGoals = matchedGoalsFor(s.tags, goalKeys);
    // A stack's own `goal` field also counts toward coverage.
    const goalFieldHit =
      s.goal != null && goalKeys.includes(s.goal.toLowerCase());
    if (matchedGoals.length === 0 && !goalFieldHit) continue;
    const score =
      matchedGoals.length * GOAL_MATCH_WEIGHT +
      (goalFieldHit ? STACK_GOAL_FIELD_BONUS : 0);
    scoredStacks.push({ ...s, score, matchedGoals });
  }

  const byScoreThenName = <T extends { score: number; name: string }>(
    a: T,
    b: T,
  ) => b.score - a.score || a.name.localeCompare(b.name);

  return {
    peptides: scoredPeptides.sort(byScoreThenName),
    stacks: scoredStacks.sort(byScoreThenName),
  };
}

/**
 * Suggest peptides and stacks for a single goal. Thin wrapper over
 * {@link suggestByGoals} kept for existing callers/tests.
 */
export function suggestByGoal(
  goal: GoalTag,
  peptides: SuggestPeptide[],
  stacks: SuggestStack[],
): { peptides: ScoredPeptide[]; stacks: ScoredStack[] } {
  return suggestByGoals([goal], peptides, stacks);
}
