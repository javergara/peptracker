---
name: add-biomarker
description: Researches a lab biomarker and adds it to the catalog / knowledge base. Use when the user wants to add a biomarker to Peptra, create a prisma/data/biomarkers/<slug>.json entry, or refresh an existing marker's cited reference ranges. Delegates research to the biomarker-researcher subagent, validates the JSON, and reseeds.
---

# Add a biomarker

Add a cited biomarker data file (catalog + knowledge base, with sex/age-aware
reference ranges) and load it into the database. Mirrors `/add-peptide`.

## Steps

1. **Identify the marker and slug.** Confirm the canonical name and a lowercase
   hyphenated `slug` (e.g. `ldl-cholesterol`, `hemoglobin`, `ferritin`). Check
   `prisma/data/biomarkers/` for an existing file (update vs. create).

2. **Delegate research** to the `biomarker-researcher` subagent (model: opus). Ask
   it to research the marker and write `prisma/data/biomarkers/<slug>.json` matching
   `biomarkerDataSchema`, with 2–4 cited reference URLs, sex/age-aware `ranges`
   (always including a sex/age-agnostic default), and educational framing. For a
   whole panel, run several biomarker-researcher agents in parallel (one per marker).

3. **Validate the JSON** against `biomarkerDataSchema` in `src/types/biomarker.ts`:

   ```bash
   node -e "const b=JSON.parse(require('fs').readFileSync('prisma/data/biomarkers/<slug>.json','utf8'));const S=new Set(['LIPIDS','LIVER','RENAL','METABOLIC','HORMONE','THYROID','HEMATOLOGY','VITAMIN','INFLAMMATION','OTHER']);if(!S.has(b.system))throw'bad system';if(!b.ranges.some(r=>!r.sex&&r.ageMin==null&&r.ageMax==null))throw'no default range';if(!b.references.length)throw'no refs';console.log('ok',b.slug)"
   ```

   Confirm `system` ∈ BIOMARKER_SYSTEMS, `direction` (if present) ∈ {high, low},
   `relatedPeptides` are real peptide slugs, and a default range exists.

4. **Seed:** `npm run db:seed` (idempotent upsert; the loader reads
   `prisma/data/biomarkers/*.json`).

5. **Verify:** confirm the seed log shows the loaded biomarker count without
   errors. Run `npm run typecheck` if you touched any TypeScript. Optionally open
   `/biomarkers/<slug>` to eyeball the resolved range + citations.

## Notes

- One biomarker per file. Keep copy **educational, not diagnostic**; ranges are
  typical/educational and vary by lab/assay.
- Lab values link to the catalog via `LabResult.biomarkerSlug`; entry auto-fills
  the unit + the profile-resolved range (snapshotted) via `resolveRange`.
- The seed only **creates** the Biomarker table's rows — on a fresh prod DB the
  table is empty until `npm run db:seed` runs (the migration creates the table).
