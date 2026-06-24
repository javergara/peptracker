/** Simple statistics helpers (pure, unit-tested). */

export interface XY {
  x: number;
  y: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
  /** Pearson correlation coefficient (signed; r² = r2). */
  r: number;
  n: number;
}

/** Ordinary least-squares linear regression of y on x, plus R² and Pearson r. */
export function linearRegression(points: XY[]): Regression {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? points[0].y : 0, r2: 0, r: 0, n };
  }

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const { x, y } of points) {
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
    syy += y * y;
  }

  const denom = n * sxx - sx * sx;
  if (denom === 0) {
    // All x identical — no meaningful slope.
    return { slope: 0, intercept: sy / n, r2: 0, r: 0, n };
  }

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  // Pearson r = cov / (sd_x * sd_y); r² is its square.
  const rDenom = Math.sqrt(denom * (n * syy - sy * sy));
  const r = rDenom === 0 ? 0 : (n * sxy - sx * sy) / rDenom;
  const r2 = r * r;

  return { slope, intercept, r2, r, n };
}

/** Qualitative strength label for |r|. */
export function correlationStrength(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return "strong";
  if (a >= 0.4) return "moderate";
  if (a >= 0.2) return "weak";
  return "negligible";
}
