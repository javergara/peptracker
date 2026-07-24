"use server";

import { getActiveUser } from "@/lib/active-user";
import { lookupOffBarcode, searchOff, type OffFood } from "@/lib/off";

/**
 * Open Food Facts lookups exposed as server actions (the fetch runs on the
 * server, so no CSP/CORS concerns and the OFF User-Agent is set). Read-only;
 * still require a session so anonymous callers can't proxy through us. Failures
 * degrade to empty results rather than throwing, so the UI stays usable offline.
 */

const OFF_UNAVAILABLE = "Couldn't reach the food database. Try again.";

export async function searchFoodDatabase(query: string): Promise<OffFood[]> {
  await getActiveUser();
  try {
    return await searchOff(query, 12);
  } catch {
    // Network/timeout — distinct from a genuine empty result (which is []).
    throw new Error(OFF_UNAVAILABLE);
  }
}

export async function lookupFoodBarcode(
  barcode: string,
): Promise<OffFood | null> {
  await getActiveUser();
  try {
    return await lookupOffBarcode(barcode);
  } catch {
    throw new Error(OFF_UNAVAILABLE);
  }
}
