---
name: add-peptide
description: Researches a new research peptide and adds it to the library. Use when the user wants to add a peptide to the Peptides Tracker, create a prisma/data/<slug>.json entry, or refresh an existing peptide's cited data. It delegates research to the peptide-researcher subagent, validates the JSON, and reseeds.
---

# Add a peptide

Add a cited peptide data file and load it into the database.

## Steps

1. **Identify the peptide and slug.** Confirm the canonical name and a lowercase
   hyphenated `slug` (e.g. `tb-500`). Check `prisma/data/` for an existing file
   for that slug (update vs. create).

2. **Delegate research** to the `peptide-researcher` subagent (model: opus). Ask
   it to research the peptide and write `prisma/data/<slug>.json` matching
   `peptideDataSchema`, with 3–6 cited reference URLs and educational framing.

3. **Validate the JSON** against `peptideDataSchema` in `src/types/peptide.ts`.
   Quick check that it parses and enums are valid:

   ```bash
   node -e "JSON.parse(require('fs').readFileSync('prisma/data/<slug>.json','utf8')); console.log('json ok')"
   ```

   Confirm `category` ∈ PEPTIDE_CATEGORIES, `route` ∈ ROUTES, every `tags` entry
   ∈ GOAL_TAGS, every `interactions[].kind` ∈ INTERACTION_KINDS. Fix any drift.

4. **Seed:** `npm run db:seed` (idempotent upsert; also derives peptide↔peptide
   interactions whose `with` resolves to a known peptide).

5. **Verify:** confirm the seed log shows the new count without errors. Optionally
   open `npm run db:studio` to eyeball the row. Run `npm run typecheck` if you
   touched any TypeScript.

## Notes

- One peptide per file. Do not put real medical advice; keep copy educational.
- If `npm run db:seed` reports the peptide missing, ensure the file is in
  `prisma/data/` and ends with `.json`.
