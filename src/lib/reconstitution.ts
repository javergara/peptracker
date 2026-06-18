import { roundTo } from "@/lib/units";

/**
 * Peptide reconstitution math: given a lyophilized vial, the volume of
 * bacteriostatic (BAC) water used to reconstitute it, and a target dose, work
 * out how much liquid to draw and how many doses the vial yields.
 */

export interface ReconInput {
  /** Total peptide mass in the vial, in milligrams. */
  vialMg: number;
  /** Volume of bacteriostatic water added, in milliliters. */
  bacWaterMl: number;
  /** Target dose per administration, in micrograms. */
  doseMcg: number;
  /**
   * Units per milliliter on the insulin syringe. Defaults to 100 (a standard
   * U-100 insulin syringe where 100 units = 1 mL).
   */
  syringeUnits?: number;
}

export interface ReconResult {
  /** Concentration in micrograms per milliliter. */
  concentrationMcgPerMl: number;
  /** Concentration in milligrams per milliliter. */
  concentrationMgPerMl: number;
  /** Volume to draw for one dose, in milliliters (rounded to 3 decimals). */
  drawMl: number;
  /** Equivalent draw expressed in insulin syringe units (rounded to 1 decimal). */
  insulinUnits: number;
  /** Whole number of doses obtainable from the vial. */
  dosesPerVial: number;
}

const EMPTY_RESULT: ReconResult = {
  concentrationMcgPerMl: 0,
  concentrationMgPerMl: 0,
  drawMl: 0,
  insulinUnits: 0,
  dosesPerVial: 0,
};

/**
 * Calculate reconstitution figures for a peptide vial.
 *
 * Guards against divide-by-zero / nonsensical input: if any of `vialMg`,
 * `bacWaterMl` or `doseMcg` is <= 0, an all-zero result is returned.
 */
export function calculateReconstitution(input: ReconInput): ReconResult {
  const { vialMg, bacWaterMl, doseMcg, syringeUnits = 100 } = input;

  if (vialMg <= 0 || bacWaterMl <= 0 || doseMcg <= 0) {
    return { ...EMPTY_RESULT };
  }

  const concentrationMcgPerMl = (vialMg * 1000) / bacWaterMl;
  const concentrationMgPerMl = vialMg / bacWaterMl;
  const drawMl = doseMcg / concentrationMcgPerMl;
  const insulinUnits = drawMl * syringeUnits;
  const dosesPerVial = Math.floor((vialMg * 1000) / doseMcg);

  return {
    concentrationMcgPerMl: roundTo(concentrationMcgPerMl, 2),
    concentrationMgPerMl: roundTo(concentrationMgPerMl, 3),
    drawMl: roundTo(drawMl, 3),
    insulinUnits: roundTo(insulinUnits, 1),
    dosesPerVial,
  };
}
