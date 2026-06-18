# Peptides Tracker

A local-first web app to **track peptide protocols** and serve as a **cited knowledge base** — dosing, benefits, risks, routes, cycles, stacks, interaction checks, and rule-based suggestions.

> ⚠️ **Educational and research use only. Not medical advice.** Many peptides listed are research compounds not approved for human use. Nothing here recommends obtaining or using any substance. Consult a qualified healthcare professional before making health decisions.

## Stack

- **Next.js 16** (App Router, React Server Components + server actions), **TypeScript**, **Tailwind v4**
- **shadcn/ui** (on `@base-ui/react`), dark/light theme, `lucide-react`, **Recharts**
- **Prisma 7** ORM with a **better-sqlite3** driver adapter (local SQLite; swap to Postgres for production)
- **Vitest** (unit) + **Playwright** (e2e); ESLint, Prettier, husky + lint-staged

## Features

- **Knowledge base** — searchable/filterable peptide library with full detail pages (mechanism, benefits, risks, dosing table, route, half-life, storage, contraindications, references) and a **reconstitution calculator**.
- **Stacks** — curated presets (incl. the **Wolverine** TB-500 + BPC-157 stack) plus a **custom stack builder** with live interaction warnings.
- **Cycles** — create protocols from a peptide or stack, schedule them, track progress and dose history.
- **Dose log** — fast logging with injection-site rotation.
- **Metrics** — weight / body-fat / sleep / recovery charts.
- **Suggestions** — rule-based recommendations by goal (fat loss, recovery, cognition, …).

## Getting started

```bash
npm install              # also runs `prisma generate`
npm run db:migrate       # apply migrations to local SQLite
npm run db:seed          # load the cited peptide data + preset stacks
npm run dev              # http://localhost:3000
```

### Scripts

| Script                    | Purpose                        |
| ------------------------- | ------------------------------ |
| `npm run dev`             | Start the dev server           |
| `npm run build` / `start` | Production build / serve       |
| `npm run test`            | Vitest unit tests              |
| `npm run test:e2e`        | Playwright smoke tests         |
| `npm run typecheck`       | `tsc --noEmit`                 |
| `npm run db:studio`       | Prisma Studio (inspect the DB) |
| `npm run db:reset`        | Reset + reseed the database    |

## Project layout

```
src/
  app/            App Router routes + server actions
  components/ui/  shadcn (base-ui) primitives
  components/     app components (shell, common, per-feature)
  lib/            db client, queries, pure logic (reconstitution, schedule, suggestions, interactions), actions/
  types/          shared zod schemas + domain vocabulary
prisma/
  schema.prisma   data model
  seed.ts         seeds from prisma/data/*.json
  data/           cited, structured peptide records (one JSON per peptide)
```

## Data & schema notes

SQLite (via Prisma) does not support enum or scalar-array columns, so enum-like fields are stored as `String` and arrays/objects as `Json`. The single source of truth for valid values and parsing is [`src/types/peptide.ts`](src/types/peptide.ts). The pure logic in `src/lib/{reconstitution,schedule,suggestions,interactions}.ts` is unit-tested.

## Working with Claude Code

This repo ships a Claude Code harness in [`.claude/`](.claude/) and [`CLAUDE.md`](CLAUDE.md): model-tiered subagents (`peptide-researcher`, `ui-builder`, `prisma-migrator`, `code-reviewer`), skills (`/add-peptide`, `/add-stack`, `/new-feature`, `/db-migrate`, `/seed-refresh`), and format/typecheck hooks.

**Add a new peptide:** run the `add-peptide` skill, or research it, write `prisma/data/<slug>.json` matching `peptideDataSchema`, and run `npm run db:seed`.

## Production deployment

Switch the Prisma datasource `provider` to `postgresql`, set `DATABASE_URL` to a Postgres connection string, swap the adapter in `src/lib/db.ts` to a Postgres driver adapter, and run `prisma migrate deploy`. The single-user model carries a `userId` throughout so multi-user auth can be added later.
