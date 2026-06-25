# Peptides Tracker

A local-first web app to **track peptide protocols** and serve as a **cited knowledge base** — dosing, benefits, risks, routes, cycles, stacks, interaction checks, and rule-based suggestions.

> ⚠️ **Educational and research use only. Not medical advice.** Many peptides listed are research compounds not approved for human use. Nothing here recommends obtaining or using any substance. Consult a qualified healthcare professional before making health decisions.

## Stack

- **Next.js 16** (App Router, React Server Components + server actions), **TypeScript**, **Tailwind v4**
- **shadcn/ui** (on `@base-ui/react`), dark/light theme, `lucide-react`, **Recharts**
- **Prisma 7** ORM with the **Neon Postgres** driver adapter; **Auth.js** login (email + password); **Vercel Blob** photo storage
- **Vitest** (unit) + **Playwright** (e2e); ESLint, Prettier, husky + lint-staged

## Features

- **Knowledge base** — searchable/filterable peptide library with full detail pages (mechanism, benefits, risks, dosing table, route, half-life, storage, contraindications, references) and a **reconstitution calculator**.
- **Stacks** — curated presets (Wolverine TB-500 + BPC-157, GH-axis CJC-1295 + Ipamorelin, …) plus a **custom stack builder** with live interaction warnings.
- **Cycles** — create protocols from a peptide or stack, schedule them, track progress and dose history, and **edit** any field later.
- **Dose log** — fast logging with injection-site rotation, optional source vial, per-dose mood/energy/side-effects, and an optional **bodyweight capture** (handy for weekly GLP-1 dosing); **edit or delete** any logged dose.
- **Inventory** — vial tracking: concentration, reconstitution + expiry warnings, doses-remaining (logging draws a vial down).
- **Calendar** — month view of logged doses, profile-colored, with **mood emoji** per day, an all-profiles overlay, and per-day quick-log.
- **Dashboard** — today's doses, adherence % + streak, and due/overdue reminders.
- **Metrics & analytics** — weight / body-fat / sleep / recovery charts, **mood (emoji faces)** & energy trends, and a **correlation explorer** (pick any two markers → scatter + trend line with Pearson r / R²).
- **Labs** — bloodwork markers with value-vs-range flags and trend charts.
- **Photos** — progress photo gallery (local storage) with before/after.
- **Accounts & profiles** — log in with email + password; each account can hold multiple profiles (e.g. you + a partner), switchable from the sidebar, fully isolated from other accounts.
- **Suggestions** — rule-based recommendations by goal (fat loss, recovery, cognition, GH-axis, …).
- **Export** — JSON backup + CSV (doses / labs).

## Getting started

```bash
cp .env.example .env     # then fill in DATABASE_URL etc. (see below)
npm install              # also runs `prisma generate`
npm run db:migrate       # apply migrations to your Postgres (Neon) DB
npm run db:seed          # load cited peptide data + preset stacks + a demo login
npm run dev              # http://localhost:3000
```

Local dev needs a Postgres database — the easiest free option is a **Neon** dev
branch. Point `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (unpooled) at it,
set `AUTH_SECRET` (`npx auth secret`), and for photo uploads run
`vercel env pull .env.local` to get `BLOB_READ_WRITE_TOKEN`. The seed prints a
demo login (`local@peptides.app` / `peptides123`).

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

The schema started on SQLite (which has no enum/scalar-array columns) and keeps those shapes on Postgres: enum-like fields are stored as `String` and arrays/objects as `Json`. The single source of truth for valid values and parsing is [`src/types/peptide.ts`](src/types/peptide.ts). The pure logic in `src/lib/{reconstitution,schedule,suggestions,interactions}.ts` is unit-tested.

## Working with Claude Code

This repo ships a Claude Code harness in [`.claude/`](.claude/) and [`CLAUDE.md`](CLAUDE.md): model-tiered subagents (`peptide-researcher`, `ui-builder`, `prisma-migrator`, `code-reviewer`), skills (`/add-peptide`, `/add-stack`, `/new-feature`, `/db-migrate`, `/seed-refresh`), and format/typecheck hooks.

**Add a new peptide:** run the `add-peptide` skill, or research it, write `prisma/data/<slug>.json` matching `peptideDataSchema`, and run `npm run db:seed`.

## Deploy to Vercel (free)

Hosts on **Vercel** with **Neon Postgres** (DB), **Vercel Blob** (photos), and
**Auth.js** login — all on free tiers.

1. **Push to GitHub.** Commit and push the repo.
2. **Create a Neon project.** Copy the **pooled** connection string and the
   **direct/unpooled** one. (Optionally create a separate `dev` branch for local.)
3. **Import the repo into Vercel** and add env vars (Project → Settings → Env):
   - `DATABASE_URL` = Neon **pooled** URL
   - `DIRECT_DATABASE_URL` = Neon **direct** URL
   - `AUTH_SECRET` = `npx auth secret`
   - `AUTH_URL` = your `https://<app>.vercel.app`
   - Enable **Vercel Blob** (Storage tab) — it sets `BLOB_READ_WRITE_TOKEN`.
4. **Set the build command** to:
   `prisma migrate deploy && prisma generate && next build`
5. **Seed once** against the prod DB (locally, with the direct URL):
   `DIRECT_DATABASE_URL="<neon-direct>" npm run db:seed`
6. **Deploy.** Vercel auto-redeploys on every push to the default branch — no
   GitHub Actions required. (Optionally add a CI workflow for typecheck/lint/test.)

Then open the URL, sign up, and share it with friends — each person gets their own
isolated account. See `.env.example` and `CLAUDE.md` → "Deployment & auth".
