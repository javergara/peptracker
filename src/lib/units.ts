/**
 * Pure unit-conversion helpers used throughout the peptide tracker.
 *
 * All functions are side-effect free and operate on plain numbers so they are
 * trivially unit-testable and safe to use in both client and server code.
 */

/** Convert micrograms (mcg) to milligrams (mg). 1 mg = 1000 mcg. */
export function mcgToMg(mcg: number): number {
  return mcg / 1000;
}

/** Convert milligrams (mg) to micrograms (mcg). 1 mg = 1000 mcg. */
export function mgToMcg(mg: number): number {
  return mg * 1000;
}

/** Convert kilograms (kg) to pounds (lb). */
export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

/** Convert pounds (lb) to kilograms (kg). */
export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

/**
 * Round a number to a fixed number of decimal places.
 *
 * @param value    The number to round.
 * @param decimals Number of decimal places to keep. Defaults to 2.
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
