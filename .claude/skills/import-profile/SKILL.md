---
name: import-profile
description: Imports personal data (profile settings, labs, measurements, vials, stock, cycles, doses) into ONE user profile in the database, read-first with a dry-run and explicit confirmation before writing. Use when the user wants to bulk-load their own data — e.g. lab PDFs/images, a CSV/JSON export, inventory, or dose history — into their Peptra profile.
---

# Import data into a user profile

Safely loads personal data into a single profile via `scripts/import-profile.ts`,
which is **read-first** and only writes with `--apply`. It never deletes.

## ⚠️ Critical safety context

- There is **one Neon database** (`.env` `DATABASE_URL`) used in both local dev and
  deployment — writes hit **real, shared data**. Treat every write as production.
- **Only ever `create`/`update`. Never delete, never `db:reset`** against this DB.
- **Never write without an explicit user "yes" on the dry-run output.**
- Health data is sensitive: import payloads + backups live in `imports/`, which is
  gitignored (only `imports/example.import.json` is tracked). Don't commit real data.
- Do NOT create accounts or set passwords — that's the user's job.

## Workflow

### 1. Locate the target profile (read-only)

```bash
npx tsx scripts/import-profile.ts --inspect --email <email>
```

Lists the account's profiles with `User.id` and existing data counts. **Confirm
with the user which `User.id` is the target** (an account can have several
profiles). Without `--email` it lists all accounts.

### 2. Collect the source data

Ask the user for the files (PDF/CSV/JSON) or content, and what each contains.
Read/extract them yourself:

- **Lab PDFs/images** → read values, units, reference ranges, and the service date
  (Colombian SURA reports use **DD/MM/YYYY**). Map each marker to a biomarker slug
  from `prisma/data/biomarkers/*.json` (`--inspect` the catalog: list the slugs).
  Use the catalog's canonical `name` as the lab `marker` so it groups with existing
  entries. If a marker has no catalog biomarker, import it slug-less and offer to
  run `/add-biomarker` afterwards, then re-link with:
  ```bash
  npx tsx scripts/import-profile.ts --relink --user <id> --marker "<name>" --slug <slug>            # dry-run
  npx tsx scripts/import-profile.ts --relink --user <id> --marker "<name>" --slug <slug> --apply-write
  ```
- **Peptide-referencing rows** (vials/stock/cycles/doses) resolve `peptide` by
  slug → name → alias. Unknown peptides are skipped and reported (add via
  `/add-peptide` first if needed).

### 3. Write the import file

Create `imports/<name>.import.json` matching the shape in
`imports/example.import.json`. Required: `userId`. All sections optional. Include
`email` so the script verifies the profile belongs to that account. Use timestamps
at `T12:00:00Z` for date-only sources to avoid TZ off-by-one.

### 4. Backup + dry-run (writes nothing)

```bash
npx tsx scripts/import-profile.ts --backup  --user <userId>
npx tsx scripts/import-profile.ts --dry-run --file imports/<name>.import.json
```

The dry-run prints every INSERT/UPDATE and flags duplicates (labs by marker+day,
cycles by name+start, doses by peptide+exact time). **Show this to the user.**

### 5. Apply only after explicit confirmation

```bash
npx tsx scripts/import-profile.ts --apply --file imports/<name>.import.json
```

Runs all queued writes in a transaction.

### 6. Verify

Re-run `--inspect --email <email>` and compare counts before/after; for labs use
`--labs --user <userId>` to list rows with their linked slug. Optionally open
`/labs`, `/inventory`, `/cycles` in the app or `npm run db:studio`. Confirm no
other profile changed.

## Extra read/maintenance modes

- `--labs --user <id>` — list a profile's lab rows (read-only).
- `--relink --user <id> --marker "<name>" --slug <slug> [--apply-write]` — attach a
  catalog biomarker slug to slug-less lab rows (e.g. after `/add-biomarker`).

## Supported sections

`profile` (User scalar fields: sex, birthYear, heightCm, timezone, weightUnit,
doseUnit, theme, color, calorie/protein/carb/fat/fiber/sodium/waterGoal) ·
`labs` · `measurements` · `vials` · `stock` · `cycles` · `doses`. See the header
comment in `scripts/import-profile.ts` for exact per-row fields.
