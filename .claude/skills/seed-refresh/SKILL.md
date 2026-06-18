---
name: seed-refresh
description: Rebuilds the local SQLite database from scratch and reseeds it from prisma/data/*.json and PRESET_STACKS. Use when the local data is stale, corrupted, or out of sync after schema/data changes, or when the user asks to reset/refresh the database.
---

# Refresh the seed / database

Reset the local dev database and reload all curated data.

## When to use

- After editing many `prisma/data/*.json` files or `PRESET_STACKS` and wanting a
  clean rebuild.
- When local data is corrupted, inconsistent, or out of sync with the schema.
- After a schema migration where you want a guaranteed-clean state.

## Warning

`npm run db:reset` **drops all local data** in `prisma/dev.db` (logs, cycles,
measurements, journal entries). This is dev-only and acceptable here, but confirm
with the user if they may have local entries worth keeping.

## Steps

1. (If only data files changed, not the schema) try a plain reseed first — it is
   idempotent and non-destructive:
   ```bash
   npm run db:seed
   ```
2. For a full clean rebuild:
   ```bash
   npm run db:reset && npm run db:seed
   ```
   `db:reset` re-applies migrations and runs the configured seed; the explicit
   `db:seed` guarantees the latest `prisma/data/*.json` and `PRESET_STACKS` are
   loaded.
3. **Verify** the seed log: peptide count, interaction count, and "Upserted N
   preset stacks", with no errors. Optionally open `npm run db:studio`.
