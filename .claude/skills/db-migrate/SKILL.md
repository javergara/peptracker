---
name: db-migrate
description: Safely changes the Prisma schema and runs the migration workflow for this Prisma 7 + SQLite project. Use when the user wants to add/change a model, field, or relation in prisma/schema.prisma. Handles SQLite enum/array limits, migrate, regenerate, and seed updates.
---

# Database migration (Prisma 7 + SQLite)

Change the schema without breaking SQLite limits or the seed. Prefer delegating
to the `prisma-migrator` subagent (model: sonnet).

## SQLite limits (must respect)

- **No `enum`** -> use `String` and add the allowed values as a const + zod in
  `src/types/peptide.ts`.
- **No scalar arrays/objects** -> use `Json`. No Json DB-defaults on SQLite, so
  every create/seed must supply a value (make optional ones nullable).

## Prisma 7 facts

- `datasource db` has **no `url`** — it lives in `prisma.config.ts` along with the
  seed command. `DATABASE_URL` is in `.env` (`file:./prisma/dev.db`).

## Steps

1. Read `prisma/schema.prisma` and `src/types/peptide.ts`.
2. Edit the schema. Enum-like field -> `String` (+ comment listing values) AND
   update `src/types/peptide.ts`. New array/object -> `Json` (nullable if optional).
3. Run the migration: `npm run db:migrate` and give it a clear name. If the change
   is destructive in dev and acceptable, use `npm run db:reset` instead (drops +
   reseeds).
4. Regenerate the client: `npx prisma generate` (or `npm run db:generate`).
5. Update `prisma/seed.ts` and, if peptide fields changed, the
   `prisma/data/*.json` shape + `peptideDataSchema`, so seeding supplies all
   Json/String values.
6. Run `npm run typecheck` to catch client-type drift, then `npm run db:seed`.

## Verify

Migration applied, client regenerated, typecheck clean, seed succeeds. Note any
data-loss in dev before resetting.
