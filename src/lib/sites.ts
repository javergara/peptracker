/**
 * Injection-site rotation. A standard subcutaneous rotation order; the next
 * suggested site simply advances around the ring from the last-used site.
 */
export const INJECTION_SITES = [
  "Abdomen L",
  "Abdomen R",
  "Love handle L",
  "Love handle R",
  "Thigh L",
  "Thigh R",
  "Delt L",
  "Delt R",
  "Glute L",
  "Glute R",
] as const;

export type InjectionSite = (typeof INJECTION_SITES)[number];

/** Next site to use given the most recently used one (cyclic rotation). */
export function suggestNextSite(lastSite: string | null | undefined): string {
  if (!lastSite) return INJECTION_SITES[0];
  const i = INJECTION_SITES.indexOf(lastSite as InjectionSite);
  if (i === -1) return INJECTION_SITES[0];
  return INJECTION_SITES[(i + 1) % INJECTION_SITES.length];
}
