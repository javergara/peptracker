---
name: add-vial
description: Adds or reconstitutes a peptide vial in the Peptides Tracker inventory. Use when the user wants to register a new vial, record a reconstitution (diluent + expiry), or correct a vial's remaining amount. Inventory lives at /inventory and is driven by src/lib/actions/vials.ts.
---

# Add or reconstitute a vial

Vials are inventory records (concentration, remaining amount, expiry) owned by
the active profile. There is no seed step — vials are created at runtime through
the UI or the server actions in `src/lib/actions/vials.ts`.

## Concepts

- A **sealed** vial has `totalMcg` (e.g. a 10 mg vial = `10000` mcg) and no
  diluent yet. **Reconstituting** sets `bacWaterMl`, computes
  `concentrationMcgPerMl` (`vialConcentration`), stamps `reconstitutedAt`, sets
  `expiresAt = now + RECONSTITUTED_SHELF_LIFE_DAYS` (28), and flips status to
  `active`.
- Logging a dose against a vial (`vialId` on `logDose`) decrements
  `remainingMcg`; it becomes `empty` at 0.
- Expiry buckets come from `vialExpiryStatus(expiresAt)`:
  `expired` / `soon` (≤7 days) / `ok` / `none`. Pure math lives in
  `src/lib/vials.ts` (unit-tested).

## Steps (UI flow — preferred)

1. Go to `/inventory`. Use **Add vial**: pick the peptide, enter total amount in
   mcg, and (optionally) the BAC water volume in mL. Leaving BAC water empty
   creates a sealed vial; filling it reconstitutes immediately.
2. For a sealed vial, use its **Reconstitute** control later to set the diluent.
3. Log doses normally; choose the vial in the dose form to draw down its
   remaining amount.

## Steps (code — if extending behavior)

- Read `src/lib/actions/vials.ts` (`createVial`, `reconstituteVial`,
  `adjustVial`, `deleteVial`) and `src/lib/vials.ts` for the math.
- New reads belong in `src/lib/queries.ts` (`listVials`,
  `getActiveVialsForPeptide`, `listActiveVials`) — keep them profile-scoped via
  `getActiveUser()`.
- After any schema change to `Vial`, run the `/db-migrate` workflow
  (`prisma migrate dev` + `npx prisma generate`).

## Verify

`npm run typecheck`, then load `/inventory` and confirm the vial shows the right
concentration, doses-remaining, and expiry badge.
