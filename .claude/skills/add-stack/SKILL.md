---
name: add-stack
description: Curates a preset peptide stack and loads it into the database. Use when the user wants to add or edit a preset stack in the Peptides Tracker (a named combination of peptides with a goal and per-item timing). It edits PRESET_STACKS in prisma/seed.ts and reseeds.
---

# Add a preset stack

Add a curated stack to `PRESET_STACKS` in `prisma/seed.ts`, then reseed.

## Steps

1. **Confirm the peptides exist.** Each stack item references a peptide by
   slug/name/alias. List `prisma/data/*.json` (or query the DB) to verify the
   referenced peptides are already in the library. If one is missing, run the
   `/add-peptide` skill first.

2. **Edit `prisma/seed.ts`** — add an entry to the `PRESET_STACKS` array:

   ```ts
   {
     slug: "my-stack",          // lowercase-hyphenated, unique
     name: "My Stack",
     goal: "Short goal phrase",
     description: "Educational rationale for the combination (not advice).",
     tags: ["fat-loss"],         // subset of GOAL_TAGS in src/types/peptide.ts
     items: [
       { peptide: "bpc-157", timing: "AM/PM" },
       { peptide: "tb-500", timing: "Weekly" },
     ],
   }
   ```

   Keep `description` educational and framed around mechanism/synergy.

3. **Reseed:** `npm run db:seed` (idempotent — upserts the stack and resets its
   items). Stack items whose peptide slug can't be resolved are silently skipped,
   so verify the seed log and the item count.

4. **Verify** the stack appears (seed log "Upserted N preset stacks", or
   `npm run db:studio`). Run `npm run typecheck` since you edited TypeScript.

## Notes

- `slug` must be unique across stacks. Re-running the seed is safe.
- Only valid `tags` from `GOAL_TAGS` in `src/types/peptide.ts`.
