/**
 * Shared constants for the duplicate-dose guard. Kept out of the `"use server"`
 * actions module (which may only export async functions) so both the server
 * action and client loggers can import them.
 */

/**
 * Sentinel `Error.message` thrown by `logDose` when a one-tap logger would
 * record the same peptide again within {@link DUPLICATE_WINDOW_HOURS}. Clients
 * match on this to offer a confirm-and-retry (resubmit with
 * `confirmDuplicate=true`) instead of failing.
 */
export const DUPLICATE_DOSE_ERROR = "DUPLICATE_DOSE";

/** How recently a same-peptide dose counts as a possible accidental duplicate. */
export const DUPLICATE_WINDOW_HOURS = 3;
