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
- **Prisma 7** with the **Neon (Postgres) driver adapter** (`@prisma/adapter-neon`).
  The schema keeps its SQLite-origin shapes (String "enums", Json arrays) — see
  below — but the DB is Postgres (Neon) in dev and prod.
- **Auth.js v5** (`next-auth`, Credentials + JWT) for login; **Vercel Blob** for
  photo storage; deployed on **Vercel**. See "Deployment & auth".
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
    queries.ts         # all read queries live here (profile-scoped)
    active-user.ts     # getActiveUser() — cookie-based active profile
    actions/           # server actions: doses, cycles, vials, labs, photos, …
    reconstitution.ts  # pure dosing math
    vials.ts           # vial concentration / doses-remaining / expiry status
    adherence.ts       # computeAdherence(cycles, doseLogs, window)
    sites.ts           # INJECTION_SITES + suggestNextSite (rotation)
    stats.ts           # linearRegression (slope/intercept/R²/Pearson r) + strength
    mood.ts            # moodFace/averageMood — 1–5 rating → emoji face (calendar/metrics)
    schedule.ts, suggestions.ts, interactions.ts
    units.ts, dates.ts, constants.ts, utils.ts  # pure helpers
                       # dates.ts: + toDateInputValue / toDateTimeLocalValue (form prefills)
  types/
    peptide.ts         # SOURCE OF TRUTH for valid values + zod schemas + parsers
  generated/prisma/    # generated client (gitignored; run `npx prisma generate`)
  auth.ts, auth.config.ts, proxy.ts   # Auth.js (login) + route gating
prisma/
  schema.prisma        # models; String "enums" + Json arrays (SQLite-origin; see below)
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
- **DoseLog** — individual logged administrations. Optional `vialId` (source
  vial; logging decrements its `remainingMcg`), `mood`/`energy` (1–5), and
  `sideEffects` (Json string[]).
- **Measurement** — weight/bodyFat/sleep/recovery/custom data points.
- **JournalEntry** — free-text notes.
- **Vial** — inventory: `totalMcg`, `bacWaterMl`, `concentrationMcgPerMl`,
  `remainingMcg`, `reconstitutedAt`, `expiresAt`, `status`
  (sealed|active|empty|expired). Math helpers in `src/lib/vials.ts`.
- **LabResult** — bloodwork markers over time (`marker`, `value`, `unit`,
  `refLow`/`refHigh`, `takenAt`).
- **Account** — auth login (`email`, `passwordHash`); owns one or more `User`
  profiles. **User** carries `accountId`.
- **Photo** — progress photos; `path` is an absolute **Vercel Blob** URL.

All profile-owned data (Cycle, DoseLog, Measurement, Vial, LabResult, Photo,
JournalEntry) is scoped to the active profile — see the multi-profile note in
Conventions.

### Schema shapes (read carefully)

The schema originated on SQLite (which can't store Prisma `enum` or scalar
list/array types) and **keeps those shapes on Postgres** for continuity — don't
"upgrade" them to native enums/arrays:

- Enum-like fields (category, route, kind, status, …) are stored as **`String`**.
- Arrays/objects (aliases, benefits, dosage, interactions, references, …) are
  stored as **`Json`** columns. Seeds/creates always supply values explicitly.
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
URL + seed command live in `prisma.config.ts`. Runtime uses the pooled
`DATABASE_URL` (Neon adapter, `src/lib/db.ts`); `migrate`/`seed` use the direct
`DIRECT_DATABASE_URL` (set in `prisma.config.ts`). Both are Postgres connection
strings (Neon) — see `.env.example`.

## Conventions

- **RSC by default.** Only add `"use client"` when you need state, effects, or
  browser APIs. Keep client components small and leaf-level.
- **Mutations = server actions** (`"use server"`), not API routes, unless an
  external caller needs a REST endpoint. **Ownership-scope every update/delete**
  of profile-owned rows: resolve the active profile, then filter by it (e.g.
  `findFirst({ where: { id, userId } })` before mutating, or `updateMany/deleteMany`
  with `{ id, userId }` and check `.count`). Never mutate a row by raw `id` alone —
  it would let one account touch another's data. See `actions/{cycles,doses}.ts`.
- **Reads go through `src/lib/queries.ts`**; import the client as
  `import { prisma } from "@/lib/db"`.
- **base-ui render prop, not `asChild`.** To compose a primitive with another
  element, use `render={<NextLink href="…" />}` style props.
- **Parse Json columns** through `src/types/peptide.ts` helpers — never cast raw.
- **Auth + multi-profile.** Login is real (Auth.js, one `Account` per login).
  An account **owns one or more `User` profiles** (e.g. "Me" + "Partner"); the
  active profile within the account is stored in the `activeUserId` cookie.
  Resolve it via `getActiveUser()` (`src/lib/active-user.ts`); `getCurrentUser()`
  in `queries.ts` delegates to it. `getActiveUser`/`getAllUsers` scope profiles to
  the session's `accountId` (from `auth()`), so accounts never see each other's
  data. All profile-owned reads (cycles, dose logs, measurements, …) MUST filter
  by the active user's id; profile **writes stamp `userId`**, and profile
  create/switch/delete must also respect `accountId` (`src/lib/actions/profiles.ts`).
  The peptide library, preset stacks, and interactions are global. Route gating
  lives in `src/proxy.ts` (Next 16 renamed `middleware`→`proxy`); auth config is
  split into edge-safe `src/auth.config.ts` + full `src/auth.ts`.
- **Disclaimer** must appear on peptide/stack/suggestion surfaces.
- **Design system (Peptra — violet).** Brand: indigo→violet→orchid
  (`#4F46E5`/`#7C3AED`/`#A855F7`), Ink `#16102E`, amber `#F59E0B` for
  alerts/warnings only. Colors live as CSS variables in `src/app/globals.css`
  (`:root` light + `.dark`) and flow through Tailwind v4 `@theme inline`. NEVER
  hardcode hex/oklch in components — use tokens (`bg-primary`,
  `text-muted-foreground`, `bg-card`, `border`, `chart-1..5`, `sidebar-*`).
  `--radius: 0.75rem`.
- **Type system:** `font-display` = Space Grotesk (headings/wordmark; h1–h3 get it
  via a base rule + CardTitle), `font-sans` = IBM Plex Sans (body), `font-mono` =
  IBM Plex Mono. **Numbers render in mono + tabular** — use the `num` utility
  (doses, %, stats, vial mcg, lab values, chart axis ticks). Fonts load in
  `layout.tsx` via `next/font`.
- **Dark "Ink" brand rail:** the sidebar is dark in BOTH themes. The `.brand-rail`
  class in `globals.css` is a token-scoping trick: it locally remaps the neutral
  tokens to a dark violet scale so any child (nav, profile switcher, account menu,
  disclaimer) reads correctly on the rail without per-component edits. Applied to
  the `<aside>` + mobile `SheetContent` in `app-shell.tsx`. Sidebar nav is grouped:
  Overview · Tracking · Health · Library · Settings.
- **Logo:** `src/components/brand/peptra-logo.tsx` — `PeptraMark` (gradient SVG,
  unique ids via `useId`) + `PeptraLogo` (mark + wordmark). App icon/favicon =
  `src/app/icon.svg`; PWA = `src/app/manifest.ts`. App name in `APP_NAME`.
- The **active profile color** (`user.color`, violet-family defaults) tints chart
  strokes, progress bars (via a `--pc` CSS var on
  `[data-slot=progress-indicator]`), and dose-row accents.
- **Progress-photo storage:** `uploadPhoto` (`src/lib/actions/photos.ts`) uploads
  to **Vercel Blob** (`put`, `access: "public"`) and stores the returned absolute
  Blob URL on `Photo.path`. Needs `BLOB_READ_WRITE_TOKEN` (auto on Vercel;
  `vercel env pull` locally). Photos render via plain `<img>` from that URL.
- **Never commit secrets or `.env`** (already gitignored). The generated Prisma
  client (`src/generated`) is gitignored — regenerate, don't commit.
- Style is enforced by prettier + eslint (+ a defensive format hook).

## Deployment & auth

Hosted on **Vercel**; **Neon Postgres** + **Vercel Blob**; **Auth.js** login.

- **Env vars** (`.env` local, Vercel project settings prod): `DATABASE_URL`
  (Neon pooled), `DIRECT_DATABASE_URL` (Neon unpooled, for migrate/seed),
  `AUTH_SECRET`, optional `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`. See `.env.example`.
- **Build command** (Vercel): `prisma migrate deploy && prisma generate && next build`.
- **Auth:** Credentials (email + password, bcryptjs) with JWT sessions — no DB
  session table. `Account { email, passwordHash }` owns `User` profiles. Sign-up/
  login/logout actions in `src/lib/actions/auth.ts`; pages at `/login`, `/signup`;
  account + logout shown in the sidebar (`src/components/auth/account-menu.tsx`).
  The root layout renders the app shell only when `auth()` has a session.
- **Local dev** points `DATABASE_URL`/`DIRECT_DATABASE_URL` at a Neon dev branch.
  Seed creates a demo login (`local@peptides.app` / `peptides123`, override via
  `SEED_ACCOUNT_EMAIL`/`SEED_ACCOUNT_PASSWORD`).
- **E2E** authenticates first via `e2e/auth.setup.ts` (saved storage state); needs
  a reachable DB + seeded demo account.

## Routes

`/login` · `/signup` · `/` dashboard · `/log` (+`/[id]/edit`) · `/calendar` ·
`/cycles` (+`/new`,`/[id]`,`/[id]/edit`) · `/inventory` (vials) · `/metrics` ·
`/labs` · `/photos` · `/peptides` (+`/[slug]`) · `/stacks` (+`/new`,`/[slug]`) ·
`/suggestions` · `/settings`. Auth routes render bare; everything else is gated.

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

- Unit/logic: **vitest** (`npm run test`). Tests live next to the lib module
  (`src/lib/<name>.test.ts`); favor testing pure functions. Currently covered:
  `reconstitution`, `schedule`, `suggestions`, `interactions`, `units`, `dates`,
  `adherence`, `sites`, `vials`, `stats`, `mood`. Keep pure math out of components so it
  stays testable.
- E2E: **playwright** (`npm run test:e2e`) — `e2e/smoke.spec.ts` is data-driven
  (asserts on seeded content, resilient to markup). Covers every route incl.
  inventory/labs/photos, the adherence widget, profile switching, and the
  all-profiles calendar overlay. The Playwright `webServer` boots `npm run dev`;
  kill any stray dev server on :3000 first.
- Always run `npm run typecheck` (+ `npm run lint`) after schema or type changes.

## Health tracking & analytics (where features live)

- **Cycles & doses:** create + **edit** both. Cycle CRUD in `actions/cycles.ts`
  (`createCycle`/`updateCycle`/`updateCycleStatus`/`deleteCycle`) with a shared
  `components/cycles/cycle-form.tsx` (new + `/[id]/edit`). Dose CRUD in
  `actions/doses.ts` (`logDose`/`updateDose`/`deleteDose`); row edit/delete via
  `components/log/dose-row-actions.tsx`, edit page at `/log/[id]/edit`. Editing a
  dose does NOT re-adjust vial inventory (documented on the form).
- **Inventory/vials:** `/inventory`, `src/lib/actions/vials.ts`, `src/lib/vials.ts`.
  Logging a dose against a vial decrements `remainingMcg` (see `logDose`).
- **Weight-at-dose:** the dose-log forms take an optional weight (via
  `DoseFormFields` `weightUnit` prop, create-only); `logDose` writes it as a
  `type:"weight"` Measurement at the dose time, so it flows into the Metrics
  charts. Not shown on the edit form (avoids duplicate measurements).
- **Adherence/reminders:** `src/lib/adherence.ts` + dashboard `Due/Overdue` and
  streak widgets (`src/components/dashboard/`). Visual only (no push).
- **Labs:** `/labs`, `src/lib/actions/labs.ts`; trend charts reuse `MetricChart`.
- **Metrics & correlation:** `/metrics`. Charts are client wrappers in
  `src/components/metrics/`: `MetricChart` (line), `CorrelationChart` (dual-axis
  time overlay), `ScatterCorrelation` (scatter + trend line), and
  `CorrelationExplorer` (pick any two series → Pearson r / R² / n via
  `src/lib/stats.ts`, pairs by nearest date within 14 days).
- **Mood visualization:** logged 1–5 mood ratings render as emoji faces via
  `src/lib/mood.ts` (`moodFace`/`averageMood`) — on the calendar day cells +
  detail (`dose-calendar.tsx`) and as emoji dots on the Mood `MetricChart`
  (`mood` prop). Energy stays a plain line.
- **Photos:** `/photos`, `src/lib/actions/photos.ts` (uploads to Vercel Blob).
- **CSV/JSON export:** `src/lib/actions/settings.ts` + `data-controls.tsx`.

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
