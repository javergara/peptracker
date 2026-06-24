/** Simple statistics helpers (pure, unit-tested). */

export interface XY {
  x: number;
  y: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
}

/** Ordinary least-squares linear regression of y on x, plus R². */
export function linearRegression(points: XY[]): Regression {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: n === 1 ? points[0].y : 0, r2: 0, n };
  }

  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const { x, y } of points) {
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
  }

  const denom = n * sxx - sx * sx;
  if (denom === 0) {
    // All x identical — no meaningful slope.
    return { slope: 0, intercept: sy / n, r2: 0, n };
  }

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const meanY = sy / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const { x, y } of points) {
    const pred = slope * x + intercept;
    ssRes += (y - pred) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}
