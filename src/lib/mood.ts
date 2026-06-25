/**
 * Map a 1–5 mood/energy rating to an emoji face + label, for visualizing logged
 * moods on the calendar and metrics charts. Returns null for missing ratings.
 */
export interface MoodFace {
  emoji: string;
  label: string;
}

export function moodFace(value: number | null | undefined): MoodFace | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return { emoji: "😢", label: "Very low" };
  if (value < 2.5) return { emoji: "🙁", label: "Low" };
  if (value < 3.5) return { emoji: "😐", label: "Neutral" };
  if (value < 4.5) return { emoji: "🙂", label: "Good" };
  return { emoji: "😄", label: "Great" };
}

/** Average of the defined mood values (rounded to nearest 0.5), or null. */
export function averageMood(
  values: (number | null | undefined)[],
): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.round(avg * 2) / 2;
}
