# Peptides Tracker — Claude Code Guide

@AGENTS.md

> The line above imports `AGENTS.md`: this Next.js version has breaking changes
> from older training data. Before writing Next.js code, read the relevant guide
> in `node_modules/next/dist/docs/`.

## Project overview

A personal peptide research + tracking app. Users browse a curated, **cited**
library of research peptides, build/curate stacks, run dosing cycles, log doses,
and track measurements/journal entries. Everything is framed as **educational
information about research compounds — not medical advice.**

## Safety / disclaimer policy (non-negotiable)

Peptides here are **research compounds**. Every surface that displays a peptide,
stack, dose suggestion, or interaction recommendation **must render the
educational "not medical advice" disclaimer** via `src/components/disclaimer.tsx`.

- Never phrase content as a prescription or personalized medical instruction.
- Keep dosing/cycle copy framed as "common educational protocols," not advice.
- Cite sources (PubMed/PMC preferred) for peptide claims.

## Stack

- **Next.js 16** App Router (React Server Components + server actions), **React 19**.
- **TypeScript**, **Tailwind v4**.
- **shadcn/ui built on `@base-ui/react`.** IMPORTANT: base-ui uses a **`render`
  prop, NOT `asChild`.** UI primitives live in `src/components/ui/`.
- **lucide-react** icons, **recharts** charts, **sonner** toasts, **next-themes**.
- **Prisma 7** with the **better-sqlite3** driver adapter.
- **zod v4** for validation.
- Tooling: vitest (unit), playwright (e2e), eslint, prettier, husky + lint-staged.

## Architecture & key directories

```
src/
  app/                 # App Router routes (RSC by default), layout, globals.css
  components/
    ui/                # shadcn/base-ui primitives (render prop, not asChild)
    disclaimer.tsx     # REQUIRED on peptide/stack/suggestion surfaces
    app-shell.tsx, theme-provider.tsx
  lib/
    db.ts              # `import { prisma } from "@/lib/db"` (runtime client)
    queries.ts         # all read queries live here
    reconstitution.ts  # pure dosing math
    units.ts, dates.ts, constants.ts, utils.ts  # pure helpers
    # schedule.ts, suggestions.ts, interactions.ts may be added as features grow
  types/
    peptide.ts         # SOURCE OF TRUTH for valid values + zod schemas + parsers
  generated/prisma/    # generated client (gitignored; run `npx prisma generate`)
prisma/
  schema.prisma        # models; SQLite has no enum/array (see below)
  seed.ts              # idempotent seed; contains PRESET_STACKS
  data/<slug>.json     # one researched peptide per file (peptideDataSchema)
  migrations/, dev.db  # dev.db is gitignored
prisma.config.ts       # Prisma 7 config (datasource.url + migrations.seed)
```

Path alias: `@/*` -> `src/*`.

## Data model summary

`prisma/schema.prisma` models:

- **User** — single local user; weight/dose units, theme.
- **Peptide** — the library entry (slug, name, category, dosage, route, etc.).
- **PeptideInteraction** — peptide↔peptide edges (synergy | caution | avoid),
  derived at seed time from each peptide's `interactions`.
- **Stack** / **StackItem** — curated or user stacks of peptides.
- **Cycle** — a planned/active dosing cycle for a peptide or stack.
- **DoseLog** — individual logged administrations.
- **Measurement** — weight/bodyFat/sleep/recovery/custom data points.
- **JournalEntry** — free-text notes.

### SQLite constraints (read carefully)

SQLite **cannot store Prisma `enum` or scalar list/array types.** Therefore:

- Enum-like fields (category, route, kind, status, …) are stored as **`String`**.
- Arrays/objects (aliases, benefits, dosage, interactions, references, …) are
  stored as **`Json`** columns. No Json DB-defaults on SQLite, so seeds/creates
  always supply values.
- The **single source of truth** for valid values and parsing is
  `src/types/peptide.ts`. When reading Json columns, parse through its helpers:
  `asStringArray`, `asDosage`, `asReconstitution`, `asInteractions`,
  `asReferences` (never trust raw Json as typed).

## Common commands

```bash
npm run dev          # next dev
npm run build        # prisma generate && next build
npm run lint         # eslint
npm run format       # prettier --write .
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:e2e     # playwright test

npm run db:generate  # prisma generate -> src/generated/prisma
npm run db:migrate   # prisma migrate dev
npm run db:reset     # prisma migrate reset --force (DROPS data, reseeds)
npm run db:seed      # tsx prisma/seed.ts (reads prisma/data/*.json)
npm run db:studio    # prisma studio
```

Prisma 7 notes: the datasource block in `schema.prisma` has **no `url`** — the
URL + seed command live in `prisma.config.ts`. `DATABASE_URL` is in `.env`
(`file:./prisma/dev.db`).

## Conventions

- **RSC by default.** Only add `"use client"` when you need state, effects, or
  browser APIs. Keep client components small and leaf-level.
- **Mutations = server actions** (`"use server"`), not API routes, unless an
  external caller needs a REST endpoint.
- **Reads go through `src/lib/queries.ts`**; import the client as
  `import { prisma } from "@/lib/db"`.
- **base-ui render prop, not `asChild`.** To compose a primitive with another
  element, use `render={<NextLink href="…" />}` style props.
- **Parse Json columns** through `src/types/peptide.ts` helpers — never cast raw.
- **Multi-profile (no login).** The active profile is stored in the
  `activeUserId` cookie. Resolve it via `getActiveUser()` (`src/lib/active-user.ts`);
  `getCurrentUser()` in `queries.ts` delegates to it. All profile-owned reads
  (cycles, dose logs, measurements) MUST filter by the active user's id; the
  peptide library, preset stacks, and interactions are global. New profile-owned
  writes must stamp `userId`. Switching/managing profiles: `src/lib/actions/profiles.ts`.
- **Disclaimer** must appear on peptide/stack/suggestion surfaces.
- **Never commit secrets, `.env`, or `*.db`** (already gitignored). The generated
  Prisma client (`src/generated`) is gitignored — regenerate, don't commit.
- Style is enforced by prettier + eslint (+ a defensive format hook).

## How to add a peptide

Preferred: run the **`/add-peptide`** skill (delegates to the `peptide-researcher`
subagent). Manual flow:

1. Research the peptide (3–6 cited reference URLs, PubMed/PMC preferred).
2. Write `prisma/data/<slug>.json` matching `peptideDataSchema` in
   `src/types/peptide.ts` (category ∈ `PEPTIDE_CATEGORIES`, route ∈ `ROUTES`,
   tags ⊆ `GOAL_TAGS`, interaction kinds ∈ `INTERACTION_KINDS`).
3. `npm run db:seed` (idempotent upsert), then verify in `npm run db:studio`.

Cross-peptide interactions are auto-derived at seed time from each peptide's
`interactions[]` whose `with` resolves to a known slug/name/alias.

## How to add a stack

Preset stacks live in `PRESET_STACKS` in `prisma/seed.ts`. Add an entry
(`slug`, `name`, `goal`, `description`, `tags`, `items[]` referencing peptides by
slug/name/alias), then `npm run db:seed`. Use the **`/add-stack`** skill.

## Testing

- Unit/logic: **vitest** (`npm run test`). Put pure-logic tests next to the lib
  module or under a `__tests__` folder; favor testing `src/lib/*` pure functions.
- E2E: **playwright** (`npm run test:e2e`).
- Always run `npm run typecheck` after schema or type changes.

## Token optimization

Delegate heavy work to the model-tiered subagents in `.claude/agents/` instead of
doing it all inline:

- **peptide-researcher** (opus) — web research + writes a peptide JSON.
- **ui-builder** (sonnet) — builds pages/components in the design system.
- **prisma-migrator** (sonnet) — schema edits + migrations + seed updates.
- **code-reviewer** (haiku) — fast diff review incl. disclaimer policy.

Subagents return **concise, structured results** (paths changed, decisions, next
steps) — not full file dumps — so the main thread stays cheap. Prefer the skills
in `.claude/skills/` (`/add-peptide`, `/add-stack`, `/new-feature`, `/db-migrate`,
`/seed-refresh`) which orchestrate these agents.
