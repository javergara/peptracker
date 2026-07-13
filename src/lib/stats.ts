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

// ── Significance (two-tailed p-value for a Pearson r) ────────────────────────
// A small-sample r can look large by chance (r=0.5 at n=5 is not significant),
// so the correlation-discovery layer gates on this p-value instead of |r| alone.

function gammaln(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Continued-fraction expansion for the incomplete beta (Numerical Recipes). */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-9;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    gammaln(a + b) -
      gammaln(a) -
      gammaln(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (bt * betacf(a, b, x)) / a
    : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Two-tailed p-value for a Pearson correlation `r` over `n` paired points
 * (H0: true correlation = 0). Uses the t-distribution: with df = n − 2, the
 * p-value simplifies to the regularized incomplete beta I_{1−r²}(df/2, ½).
 * Returns 1 (not significant) when n < 3.
 */
export function pearsonPValue(r: number, n: number): number {
  if (n < 3) return 1;
  const rr = Math.max(-0.999999, Math.min(0.999999, r));
  const df = n - 2;
  return betai(df / 2, 0.5, 1 - rr * rr);
}
