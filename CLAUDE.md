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

- **User** — a profile; weight/dose units, theme, and optional `sex`/`birthYear`
  (drive sex/age-aware biomarker reference ranges).
- **Peptide** — the library entry (slug, name, category, dosage, route, etc.).
- **Biomarker** — global lab-marker catalog + cited knowledge base (the labs
  analog of Peptide): `slug`, `name`, `system` (panel group), `unit`, `summary`,
  `whatItMeans`, `raises`/`lowers`/`confounders`/`relatedPeptides` (Json string[]),
  `ranges` (Json `RefRange[]`, sex/age-aware), `references`, `direction`. Source of
  truth = `src/types/biomarker.ts` (`resolveRange`, `asRefRanges`, `SYSTEM_LABELS`).
- **Supplement** — continuous compounds tracked as date ranges (overlay the
  biomarker timeline as confounder bands; no per-dose logging).
- **LabReminder** — one-off lab-recheck action items (`label`, `dueAt`,
  `biomarkerSlug?`, `completedAt?`); surfaced via the daily reminders cron.
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
  `refLow`/`refHigh`, `takenAt`, optional `biomarkerSlug` → catalog). Ranges are
  **snapshotted** at entry so flags stay stable; `biomarkerSlug` drives KB linking
  - panel grouping.
- **Account** — auth login (`email`, `passwordHash`); owns one or more `User`
  profiles. **User** carries `accountId`.
- **Photo** — progress photos; `path` is a **Vercel Blob pathname** (private store),
  served via the gated `/api/photos/[id]` route.

All profile-owned data (Cycle, DoseLog, Measurement, Vial, LabResult, Photo,
JournalEntry, Supplement, LabReminder, PushSubscription) is scoped to the active
profile — see the multi-profile note in Conventions. **Biomarker is global**
(reference data), like Peptide / preset stacks.

### Schema shapes (read carefully)

The schema originated on SQLite (which can't store Prisma `enum` or scalar
list/array types) and **keeps those shapes on Postgres** for continuity — don't
"upgrade" them to native enums/arrays:

- Enum-like fields (category, route, kind, status, …) are stored as **`String`**.
- Arrays/objects (aliases, benefits, dosage, interactions, references, …) are
  stored as **`Json`** columns. Seeds/creates always supply values explicitly.
- The **single source of truth** for valid values and parsing is
  `src/types/peptide.ts` (peptides) and `src/types/biomarker.ts` (biomarkers).
  When reading Json columns, parse through their helpers: `asStringArray`,
  `asDosage`, `asReconstitution`, `asInteractions`, `asReferences`, `asRefRanges`
  (never trust raw Json as typed).

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
  `import { prisma } from "@/lib/db"`. **Always give date-bearing list reads an
  explicit `orderBy`** (never rely on insertion order) — date-keyed records
  (doses, vials, measurements, labs, supplements, reminders, exports) sort by
  their natural date field with a stable tiebreaker (e.g. doses
  `[{ takenAt }, { createdAt }]`); pending-before-completed lists use
  `{ completedAt: { sort: "asc", nulls: "first" } }`.
- **Caching (Neon free tier is compute/CU-hour bound — minimize round-trips).**
  Two layers, applied deliberately:
  - **Per-request dedupe:** `getActiveUser`/`getAccountId` (`active-user.ts`) are
    wrapped in React `cache()`, so the many read fns that resolve the active
    profile do **one** session+profile lookup per render/action, not one each.
    These are per-request only — never cross-request (a global cache would leak
    one account's profile to another). Don't re-wrap or assume them uncached.
  - **Cross-request cache for GLOBAL, seed-only data:** the peptide library,
    biomarker catalog, and interaction edges go through `unstable_cache`
    (`next/cache`, 1h `revalidate` + `tags`) in `queries.ts` — served from Next's
    data cache instead of hitting Neon every view. Rule of thumb: **cache global
    reference reads; never cache user-scoped reads.** **Stacks are intentionally
    NOT cached** — `Stack.userId` exists and stacks are user-created in the
    builder, so caching could hide a freshly built stack. After `db:seed` adds
    catalog rows they appear within ≤1h (or immediately on redeploy).
- **Form feedback:** wrap server-action add/edit forms in `ActionForm` +
  `SubmitButton` (`src/components/common/action-form.tsx`) — pending-disable +
  spinner, success toast, and the thrown error shown as a toast. Don't use bare
  `<form action={serverAction}>` for user-facing forms.
- **Destructive actions** need undo or confirm (never silent immediate): doses use
  an **undo toast** (`deleteDose` returns a snapshot, `restoreDose` re-creates);
  photos `confirm()` (blob can't be undone).
- **Loading states:** data-heavy routes have a `loading.tsx` rendering
  `PageSkeleton` (`src/components/common/page-skeleton.tsx`).
- **Client filter/UI state belongs in the URL** (shareable/reload-safe): see the
  peptide library (`?q&cat`) and metrics trends (`?series`); wrap such client
  components in `<Suspense>` (for `useSearchParams`). Calendar uses `?month&view`.
- **A11y baseline:** associate `<label htmlFor>`/`id`; real heading elements
  (`CardTitle` is an `<h2>`); visible `focus-visible` rings on custom interactive
  elements; skip-link → `#main-content` in `app-shell`. Globals set
  `touch-action: manipulation` + honor `prefers-reduced-motion`.
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
- **Design system (Peptra — violet · "Clinical Instrument").** Brand:
  indigo→violet→orchid (`#4F46E5`/`#7C3AED`/`#A855F7`), Ink `#16102E`, amber
  `#F59E0B` for alerts/warnings only. The field is a warm violet-tinted off-white
  (`--background #F7F6FB`); cards are pure white with a cool hairline
  (`--border #ECE8F7`) and a soft depth shadow. Colors live as CSS variables in
  `src/app/globals.css` (`:root` light + `.dark`) and flow through Tailwind v4
  `@theme inline`. NEVER hardcode hex/oklch in components — use tokens
  (`bg-primary`, `text-muted-foreground`, `bg-card`, `border`, `chart-1..5`,
  `sidebar-*`). `--radius: 0.75rem`.
- **Clinical status colors (the ONE brand exception).** Labs/Inventory in/out-of-
  range signalling uses dedicated tokens — green `--ok`, amber `--warn`
  (+`--warn-foreground`), red `--bad`, slate `--sealed`, each with a `-wash`
  variant (e.g. `bg-ok-wash text-ok`). These are **clinical-only**: never use
  green/red on brand surfaces. Mapped in `LAB_STATUS_STYLE` / `VIAL_STATUS_STYLE`
  (`src/lib/constants.ts`). Amber stays reserved for warnings everywhere else.
- **Surface helpers + primitives.** `globals.css` exposes the layered-surface
  vocabulary as tokens/utilities: gradients `--gradient-ink-panel` /
  `--gradient-ink-strip` / `--gradient-ink-bar` (mobile tab bar) /
  `--gradient-gauge` (violet progress fills), shadows `--shadow-card` /
  `--shadow-card-hover`, and the `@utility eyebrow` (mono-uppercase section label)
  - `@utility card-surface` (white card + hairline + soft shadow). The reusable
    presentational primitives live in `src/components/common/`: `InkPanel`
    (dark data-readout panel — dashboard hero, inventory summary strip, correlation
    result), `AdherenceRing` (SVG donut gauge), `Sparkline`/`MiniBars` (inline stat
    trends), `VialGauge` (drawn vial w/ fill, driven by `vials.ts`), `RangeTrack`
    (lab reference-range rail, driven by `labStatus` in `src/lib/labs.ts`), and
    `Eyebrow`. SVG gauges use `useId` for gradient/clip ids (so they're `"use
client"`). Reuse these; don't reinvent gauges/panels.
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
  Overview · Tracking · Health · Library · Settings · **Tools**. The Tools group
  holds **`SidebarCalculator`** (`src/components/peptides/sidebar-calculator.tsx`)
  — a nav-styled trigger that opens the `ReconstitutionCalculator` in a centered
  dialog for quick reconstitution math from anywhere (generic, no `peptideId`).
  On mobile (`<lg`) an **Ink
  bottom tab bar** (`MobileTabBar` in `app-shell.tsx`, `--gradient-ink-bar`) gives
  quick access to Home/Log/Calendar/Metrics; the hamburger `Sheet` stays for full
  nav. `main` gets extra bottom padding on mobile so content clears the bar.
- **Logo:** `src/components/brand/peptra-logo.tsx` — `PeptraMark` (gradient SVG,
  unique ids via `useId`) + `PeptraLogo` (mark + wordmark). App icon/favicon =
  `src/app/icon.svg`; PWA = `src/app/manifest.ts`. App name in `APP_NAME`.
- The **active profile color** (`user.color`, violet-family defaults) tints chart
  strokes, progress bars (via a `--pc` CSS var on
  `[data-slot=progress-indicator]`), and dose-row accents.
- **Progress-photo storage:** `uploadPhoto` (`src/lib/actions/photos.ts`) uploads
  to **Vercel Blob** with **`access: "private"`** (sensitive health photos) and
  stores the blob **pathname** on `Photo.path`. Images are served through the
  login-gated, account-scoped route **`/api/photos/[id]`** (streams the private
  blob via `get(path, { access: "private" })`); `<img src="/api/photos/<id>">`.
  Needs `BLOB_READ_WRITE_TOKEN` (auto on Vercel; `vercel env pull` locally). The
  Vercel Blob store must be a **private** store. Uploads are **compressed
  client-side first** via `PhotoFileInput` (`src/components/photos/photo-file-input.tsx`):
  it downscales (≤1600px) + re-encodes to WebP/JPEG (<~900 KB) in the browser and
  feeds the result into a hidden `name="file"` input via `DataTransfer`, so the
  `uploadPhoto` action is unchanged. This keeps Blob storage/transfer small (1 GB
  free store) and keeps payloads under Next's server-action body limit
  (`serverActions.bodySizeLimit: "4mb"` in `next.config.ts`, under Vercel's
  ~4.5 MB function cap). Reuse this pattern for any future image/file upload.
- **Never commit secrets or `.env`** (already gitignored). The generated Prisma
  client (`src/generated`) is gitignored — regenerate, don't commit.
- Style is enforced by prettier + eslint (+ a defensive format hook).

## Deployment & auth

Hosted on **Vercel**; **Neon Postgres** + **Vercel Blob**; **Auth.js** login.

- **Env vars** (`.env` local, Vercel project settings prod): `DATABASE_URL`
  (Neon pooled), `DIRECT_DATABASE_URL` (Neon unpooled, for migrate/seed),
  `AUTH_SECRET`, optional `AUTH_URL`, `BLOB_READ_WRITE_TOKEN`. See `.env.example`.
- **Build command** (Vercel): `prisma migrate deploy && prisma generate && next build`.
- **Free-tier capacity (binding constraints, all hard-pause/suspend — no overage).**
  Ranked first-to-bite: (1) **Vercel Hobby = non-commercial only** — monetizing
  requires Pro; (2) **Vercel Blob 1 GB** store ≈ ~500 photos total → ~50
  photo-using users (mitigated by the client-side compression above); (3) **Neon
  free** 0.5 GB storage + 100 CU-hrs/mo (autosuspends after 5 min idle, ~sub-sec
  cold start) ≈ a few hundred light users; (4) **Blob transfer** 10 GB/mo;
  Vercel compute/invocations/bandwidth (4 CPU-hrs / 1M invocations / 100 GB) have
  slack to ~1–4k users. Practical envelope: **~100–300 concurrent** (Neon
  compute-bound; Vercel allows 30k), **~200–400 total** light users (**~50** if
  photo-heavy). The caching + photo-compression conventions above exist to push
  these up. Keep this in mind before adding per-request DB reads or uncompressed
  uploads. [[free-tier-capacity]]
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
`/suggestions` · `/supplements` · `/biomarkers` (+`/[slug]`) · `/settings`. Auth
routes render bare; everything else is gated.

## Mobile / PWA (iPhone)

The app ships as an **installable PWA** (Phase 1 — free, no App Store). The app
**cannot be statically exported** (RSC + server actions + Prisma + Auth.js
cookies), so the future native path (Phase 2) is a thin **Capacitor** shell whose
WKWebView points at the live Vercel deployment (`server.url`) — not a bundled
export. See `DEPLOYMENT.md`/the plan for Phase 2.

- **Install metadata:** `src/app/manifest.ts` (id/scope/icons incl. 192/512 +
  maskable PNGs in `public/icons/`), plus `metadata`/`viewport` in
  `src/app/layout.tsx` (`appleWebApp`, `viewportFit:"cover"`, dual `themeColor`,
  legacy `apple-mobile-web-app-capable`). Apple touch icon is
  `src/app/apple-icon.png` (180, generated from `src/app/icon.svg` via `sips`).
- **Safe areas:** with `viewport-fit=cover`, chrome clears the notch/home
  indicator via `env(safe-area-inset-*)` Tailwind arbitraries in
  `app-shell.tsx` (mobile header, brand-rail aside, mobile `SheetContent`, main
  bottom padding). In a normal browser the insets resolve to 0 — desktop is
  unaffected. Use `pt-[env(safe-area-inset-top)]` / `pb-[calc(...+env(...))]`.
- **Service worker:** hand-written `public/sw.js` (no bundler step — robust under
  Turbopack), registered by `src/components/pwa/service-worker-register.tsx`
  (production only). Offline = precache + SWR for static assets + the PUBLIC
  `/peptides` library + `public/offline.html` navigation fallback. **PRIVACY: the
  SW never caches `/api/*` or authenticated per-profile pages** — only the global
  library + static assets.
- **Web-push dose reminders:** `PushSubscription` model (profile-scoped); subscribe
  UI = `src/components/pwa/reminder-settings.tsx` (standalone-only; iOS needs the
  PWA added to the home screen first); actions in `src/lib/actions/notifications.ts`
  (`save/removePushSubscription`, ownership-scoped); sender = `src/lib/push.ts`
  (VAPID via `web-push`); the SW has `push`/`notificationclick` handlers. The
  **daily** cron is `src/app/api/cron/reminders/route.ts` (Bearer `CRON_SECRET`,
  excluded from the proxy matcher, self-protects) scheduled in `vercel.json`
  `crons` — it reuses `getTodaysDoses` + `computeOverdue` (now in
  `src/lib/adherence.ts`). **Vercel Hobby = once-daily cron**; iOS web push is
  flakier than native (subscriptions can drop) — native APNs is the Phase-2 fix.
- **Env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `CRON_SECRET` (see `.env.example`; generate keys with
  `npx web-push generate-vapid-keys`). Set them in Vercel for prod.

## How to add a peptide

Preferred: run the **`/add-peptide`** skill (delegates to the `peptide-researcher`
subagent). Manual flow:

1. Research the peptide (3–6 cited reference URLs, PubMed/PMC preferred).
2. Write `prisma/data/<slug>.json` matching `peptideDataSchema` in
   `src/types/peptide.ts` (category ∈ `PEPTIDE_CATEGORIES`, route ∈ `ROUTES`,
   tags ⊆ `GOAL_TAGS`, interaction kinds ∈ `INTERACTION_KINDS`). The `dosage`
   object also takes optional **`timing`**, **`maxDose`**, and **`protocols`**
   (titration: `[{ label?, steps: [{ weeks, amount:number, unit:"mg"|"mcg", note? }] }]`).
   The detail page renders the titration as a table and auto-computes injection
   volume in insulin-syringe units from the peptide's `reconstitution`
   (`calculateReconstitution` in `src/lib/reconstitution.ts`).
3. `npm run db:seed` (idempotent upsert), then verify in `npm run db:studio`.

Cross-peptide interactions are auto-derived at seed time from each peptide's
`interactions[]` whose `with` resolves to a known slug/name/alias.

## How to add a stack

Preset stacks live in `PRESET_STACKS` in `prisma/seed.ts`. Add an entry
(`slug`, `name`, `goal`, `description`, `tags`, `items[]` referencing peptides by
slug/name/alias), then `npm run db:seed`. Use the **`/add-stack`** skill.

## How to add a biomarker

Mirrors "add a peptide". Write `prisma/data/biomarkers/<slug>.json` matching
`biomarkerDataSchema` in `src/types/biomarker.ts` (`system` ∈ `BIOMARKER_SYSTEMS`,
`ranges` = `RefRange[]` with optional `sex`/`ageMin`/`ageMax`/`low`/`high`/`note` —
**always include one sex/age-agnostic default rule** so `resolveRange` resolves
when the profile has no sex/age; `relatedPeptides` are peptide slugs; cite every
range in `references`). Then `npm run db:seed` (idempotent upsert; the loader reads
`prisma/data/biomarkers/*.json`). Author with cited reference ranges (Mayo /
MedlinePlus / labtestsonline / guideline bodies) — treat ranges as **educational /
typical**, not authoritative (they vary by lab/assay).

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
- **Labs & biomarkers:** `/labs` (`src/lib/actions/labs.ts`) groups results by
  biomarker **system** (Lipids/Liver/Renal/…), supports **panel entry**
  (`addLabPanel`: one date, many catalog markers via parallel `slug[]`/`value[]`)
  and biomarker-linked single entry (`addLab` with `biomarkerSlug` → auto unit +
  sex/age-aware range via `resolveRange`, snapshotted). Each marker renders a
  `MarkerTimelineChart` (`src/components/metrics/marker-timeline-chart.tsx`) — its
  trend with **intervention bands** (cycles + supplements) from
  `getInterventionBands` (`src/lib/interventions.ts`, pure + tested) and a shaded
  reference-range band. The **biomarker library/KB** is `/biomarkers`
  (+`/[slug]`): cited reference, profile-resolved range, raises/lowers/confounders,
  related peptides, and the profile's own history chart.
- **Supplements:** `/supplements`, `src/lib/actions/supplements.ts` — continuous
  compounds as date ranges; they overlay the biomarker timeline as confounder bands.
- **Lab-recheck reminders:** `src/lib/actions/labReminders.ts` + a "Schedule a
  recheck" form on `/labs`; due, uncompleted reminders ride the **existing daily
  reminders cron** (`src/app/api/cron/reminders/route.ts`) into the push (no second
  Vercel cron).
- **Metrics & correlation:** `/metrics`. Charts are client wrappers in
  `src/components/metrics/`: `MetricsTrends` (the main view — ALL series in one
  chart, toggled from a legend; each series keeps its own hidden Y axis so
  differently-scaled series like weight vs mood overlay on a shared timeline),
  `MetricChart` (single line; `mood` prop = emoji-face dots), `CorrelationChart`
  (dual-axis overlay), `ScatterCorrelation` (scatter + trend line), and
  `CorrelationExplorer` (pick any two series → Pearson r / R² / n via
  `src/lib/stats.ts`, pairs by nearest date within 14 days). The page builds one
  `TrendSeries[]` from measurement types + mood + energy + lab markers.
- **Injection-site rotation (calendar):** `dose-calendar.tsx` shows each dose's
  `site` (abbreviated via `shortSite`) in the day cells (desktop grid + mobile
  agenda) and a **SITE ROTATION** panel in the sidebar — last-used site + next
  suggested via `suggestNextSite` (`src/lib/sites.ts`). Single-profile only;
  derived from the most recent sited dose in the visible month.
- **Mood visualization:** logged 1–5 mood ratings render as emoji faces via
  `src/lib/mood.ts` (`moodFace`/`averageMood`) on the calendar day cells + detail
  (`dose-calendar.tsx`); on `/metrics` mood is a toggleable line in `MetricsTrends`.
- **Photos:** `/photos`, `src/lib/actions/photos.ts` (private Vercel Blob, served
  via `/api/photos/[id]`). UI is `components/photos/photo-board.tsx` (client):
  full images (object-contain), click-to-zoom lightbox, and a Before/After with
  selectable photos (defaults oldest→newest).
- **CSV/JSON export:** `src/lib/actions/settings.ts` + `data-controls.tsx`.

## Token optimization

Delegate heavy work to the model-tiered subagents in `.claude/agents/` instead of
doing it all inline:

- **peptide-researcher** (opus) — web research + writes a peptide JSON.
- **biomarker-researcher** (opus) — web research + writes a cited biomarker JSON
  (`prisma/data/biomarkers/<slug>.json`) with sex/age-aware reference ranges.
- **ui-builder** (sonnet) — builds pages/components in the design system.
- **prisma-migrator** (sonnet) — schema edits + migrations + seed updates.
- **code-reviewer** (haiku) — fast diff review incl. disclaimer policy.

Subagents return **concise, structured results** (paths changed, decisions, next
steps) — not full file dumps — so the main thread stays cheap. Prefer the skills
in `.claude/skills/` (`/add-peptide`, `/add-biomarker`, `/add-stack`, `/add-vial`,
`/new-feature`, `/db-migrate`, `/seed-refresh`) which orchestrate these agents.
