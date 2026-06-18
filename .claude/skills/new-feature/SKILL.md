---
name: new-feature
description: Scaffolds a new page or feature in the Peptides Tracker (App Router route + server component, server action for mutations, queries in src/lib/queries.ts, optional vitest). Use when the user wants to add a new screen, route, or feature to the app.
---

# Scaffold a new feature

Add a route/feature following project conventions. Prefer delegating the UI build
to the `ui-builder` subagent (model: sonnet).

## Steps

1. **Plan the route.** Decide the segment under `src/app/<segment>/page.tsx`.
   Read a sibling page for layout/import patterns. Read `CLAUDE.md` and
   `AGENTS.md` (Next.js 16 differs from older docs).

2. **Add reads to `src/lib/queries.ts`.** Put all DB reads there, importing
   `{ prisma } from "@/lib/db"`. Parse any Json columns through
   `src/types/peptide.ts` helpers.

3. **Build the page as a Server Component.** No `"use client"` unless you need
   state/effects/browser APIs (then isolate it in a small leaf component).
   - base-ui primitives use the **`render` prop, not `asChild`**.
   - Reuse `src/components/ui/*`, lucide icons, recharts for charts.
   - If it shows peptide/stack/suggestion data, render
     `src/components/disclaimer.tsx`.

4. **Mutations = server actions** (`"use server"`), colocated or in an `actions.ts`
   in the route folder. Validate input with zod. Revalidate as needed.

5. **Optional vitest** for any new pure logic added to `src/lib/*` (test the
   function, not the React tree). Run `npm run test`.

6. **Verify:** `npm run typecheck` and `npm run lint`; fix introduced issues.
   Optionally have the `code-reviewer` subagent review the diff.

## Return / done criteria

Route renders, queries live in `src/lib/queries.ts`, mutations are server actions,
disclaimer present where required, typecheck + lint clean.
