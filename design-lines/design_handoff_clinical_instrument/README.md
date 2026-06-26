# Handoff: Peptra "Clinical Instrument" Redesign

## Overview
A visual redesign of the Peptra peptide-tracker. It **keeps the existing Peptra
violet + Ink identity, type system, and architecture** and raises the visual
ceiling: dark "Ink" data-readout panels, real data-visualisation (adherence
rings, vial gauges, lab reference-range tracks, multi-series charts), a layered
surface system, and Apple-Health-style calm spacing. The goal is to move the app
from "competent shadcn dashboard" to "premium clinical instrument."

This is an **elevation, not a rewrite** — the IA, routes, components, and tokens
all stay; mostly you are restyling existing components and adding a few new
presentational ones (Ink panel, ring gauge, vial gauge, reference-range track).

## About the Design Files
The file in this bundle — `Peptra Redesign.dc.html` — is a **design reference
created in HTML** (a static, pannable canvas of five screen mockups). It is
**not** production code to paste in. Your job is to **recreate these designs in
the existing codebase** (Next.js 16 App Router + React 19 + Tailwind v4 +
shadcn/base-ui), using its established patterns: CSS-variable tokens in
`globals.css`, the `ui/` primitives, the `num` utility for numerals, lucide
icons, recharts for charts, and the `brand-rail` scoping trick. Reuse what's
there; don't fork the system.

> Open the HTML file in a browser to explore it. It is a zoom/pan canvas with
> five frames: **01 Dashboard (desktop), 02 Metrics, 03 Dashboard (iPhone),
> 04 Inventory, 05 Labs.**

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component treatments
are intentional and specified below to the hex/px. Recreate them faithfully,
but express them through the codebase's existing tokens and components (e.g.
change a token value in `globals.css` rather than hardcoding a hex in a
component — the repo's rule of "never hardcode hex in components" still holds).

The five frames are representative archetypes, not the whole app. Once the
language is in place (tokens + the shared primitives below), roll it onto the
remaining routes (Calendar, Cycles, Peptides library/detail, Stacks,
Suggestions, Photos, Settings) by reusing the same patterns.

---

## The visual language (apply globally)

Four moves define the redesign. Build these as shared primitives first, then the
screens fall out of them.

1. **Ink data panels.** The single most important metric on a screen sits on a
   dark Ink gradient panel with a soft violet glow and a large mono numeral —
   like a premium device readout. This pulls the dark rail identity into the
   body. Used for: dashboard "Today / doses due" hero, the correlation result on
   Metrics, the inventory summary strip.
   - Background: `radial-gradient(130% 150% at 88% -30%, rgba(168,85,247,.55), transparent 55%), linear-gradient(155deg,#241A4E 0%,#16102E 70%)`
   - Text `#EFEBFA`, muted `#A8A2CC`, eyebrow `#C4B5FD`, radius `20px`.

2. **Instrument gauges (real data-viz, not bare progress bars).**
   - **Adherence ring** — SVG donut, `r=50`, track `#EDE9FE`, progress a violet
     gradient (`#A855F7→#6D28D9`), `stroke-width:13`, round caps, big mono % in
     the center. (`dasharray = circumference × percent`, `circumference≈314`.)
   - **Vial gauge** — a drawn vial (cap + body rounded-rect, hairline outline)
     with a fill level clipped to the body; violet gradient fill for active,
     amber for "expires soon," desaturated for sealed, red for expired, dashed
     baseline for empty.
   - **Lab reference-range track** — a rail (`#F1EEF9`) with the normal band as a
     lilac inset (`#EDE9FE`) positioned by `left%/right%`, and a marker dot
     (`15px`, white ring, colored by status) positioned by `left%`.

3. **Layered surfaces + hairlines + calm space.** Page background is a violet-
   tinted off-white `#F7F6FB`; cards are pure white `#FFFFFF` with a `1px`
   hairline `#ECE8F7` and a very soft shadow. Section titles in Space Grotesk;
   small eyebrows in **mono uppercase, letter-spaced** (`IBM Plex Mono`,
   `10–11px`, `letter-spacing:.12–.16em`, color `#8B86AD`).

4. **Mono numerals everywhere data lives,** plus inline **sparklines / mini-bars**
   next to stat numbers for instant trend context. This is the existing `num`
   utility (IBM Plex Mono, tabular) — keep using it for every dose, %, mcg, lab
   value, and axis tick.

---

## Design tokens

These extend the existing `globals.css` palette — most already exist; the
redesign mainly **adds layered surfaces, status colors, and gauge gradients**.
Add/confirm these as CSS variables; do not hardcode in components.

### Core (already in the system — keep)
| Token | Light value | Use |
|---|---|---|
| `--background` | `#F7F6FB` *(slightly warmer than current `#fbfafe`)* | page field |
| `--card` | `#FFFFFF` | card surface |
| `--foreground` | `#16102E` | primary text (Ink) |
| `--muted-foreground` | `#6F6A93` | secondary text |
| `--primary` | `#7C3AED` | violet — actions, primary series |
| `--border` | `#ECE8F7` | hairline (slightly cooler than current) |
| `--radius` | `0.75rem` | base; cards use `~18–20px`, pills `999px` |

### Chart series (already defined as `--chart-1..5`)
`#7C3AED` violet · `#818CF8` periwinkle · `#4F46E5` indigo · `#A855F7` orchid ·
`#F59E0B` amber.

### New — status semantics (for Labs / Inventory)
| Token | Hex | Meaning |
|---|---|---|
| `--ok` | `#16A06A` | in range / good (text), bg wash `#E7F6EF` |
| `--warn` | `#F59E0B` marker / `#B97608` text | borderline / expires soon, bg `#FCEFD2` |
| `--bad` | `#C8474B` | out of range / expired, bg `#FBE3E3` |
| `--sealed` | `#5B6794` | unopened vial, bg `#EEF1F9` |

> Amber stays reserved for warnings only (matches the existing policy). Green and
> red are **new** but used strictly for clinical in-range / out-of-range
> semantics — they don't enter the brand palette elsewhere.

### New — surface helpers
- Ink panel gradient (see move #1 above).
- Eyebrow label: `font-family:var(--font-mono); font-size:10–11px; letter-spacing:.14em; text-transform:uppercase; color:#8B86AD`.
- Card shadow: `0 1px 2px rgba(22,16,46,.04), 0 12px 28px -20px rgba(22,16,46,.18)`.
- Gauge gradient: `linear-gradient(180deg,#A855F7,#6D28D9)`.

### Typography (unchanged — keep the existing system)
- **Display / headings / wordmark:** Space Grotesk, `letter-spacing:-.02em`.
  H1 `28–30px/600`, section H2 `16px/600`.
- **Body:** IBM Plex Sans, `13–14px`.
- **Numerals:** IBM Plex Mono, tabular (`num`). Hero readouts `56–74px/600`;
  stat tiles `22–30px`; inline values `13–18px`.

---

## Screens

### 01 · Dashboard (desktop) — flagship
- **Layout:** existing shell — `246px` dark Ink `brand-rail` + fluid `main`
  (padding `26px 30px`). Content is a vertical stack of card rows on `#F7F6FB`,
  `max-w-6xl`, `18px` gaps.
- **Page header:** `4px` violet gradient accent bar + H1 "Dashboard" (Space
  Grotesk 30/600) + muted subtitle with date. Right: ghost theme-toggle icon
  button (`38px`, white, hairline) + violet "New cycle" button (`40px`, gradient
  `#8B47F0→#7C3AED`, shadow `0 10px 22px -10px rgba(124,58,237,.85)`).
- **Row 1 — `1.55fr / 1fr` grid:**
  - **Ink hero** (move #1): eyebrow "TODAY · DUE NOW", giant mono `2` + "doses
    due", helper line, two dose chips (`rgba(255,255,255,.07)` pills with a
    colored dot + mono dose), and a **white** "Log dose" button (Ink text). Faint
    molecule SVG bleeding off the top-right corner at `opacity:.18`.
  - **Adherence card** (white): eyebrow "30-DAY ADHERENCE", the ring gauge (92%),
    beside it a flame + mono `14`-day streak, "342 of 372 scheduled doses," and a
    green "Best month yet" check chip.
- **Row 2 — three stat tiles** (`repeat(3,1fr)`): Active cycles `3` + violet
  **sparkline**; Doses this week `9` + violet **mini-bars**; Library `24` + book
  icon tile and a violet "Browse peptides →" link. Mono numbers `30px`.
- **Row 3 — `1fr/1fr`:** "Today's doses" list (dot + name + sub, right-aligned
  mono dose + time/site; one row shows a green "Logged" state) and "Active
  cycles" with gradient progress bars (`8px`, `#EDE9FE` track, violet gradient
  fill) + mono "64% · wk 8/12".
- **Row 4 — Recent doses table:** mono-uppercase column eyebrows; rows have a
  `3px` violet accent bar before the peptide name, mono amount, muted when/site,
  and a **mood emoji** in the last column (the app already maps mood 1–5 → emoji
  face via `lib/mood.ts` — keep that).

### 02 · Metrics
- **Header** like Dashboard + a segmented range control (`7d / 30d / 90d / 1y`,
  active pill is Ink `#16102E` white) + violet "Add" button.
- **Four metric tiles** (Weight / Body fat / Sleep / Recovery): eyebrow, mono
  value + unit, and a colored delta line (green `▼ 2.4 kg / 30d`).
- **Trends card:** a single multi-series line chart (recharts) on one timeline —
  Weight (violet `#7C3AED`, with a soft area-gradient fill at `.16→0`), Energy
  (green `#16A06A`), Mood (dotted lilac `#D8D0EE`). Each series keeps its own
  hidden Y axis so differently-scaled series overlay (this matches the existing
  `MetricsTrends` behavior). Horizontal gridlines `#F1EEF9`, mono axis ticks,
  endpoint dots.
- **Correlation explorer — `1.1fr/1fr`:** white scatter card (dots `#7C3AED@.75`
  + dashed orchid trend line, mono axis labels) **+ an Ink result panel** with a
  huge mono `−0.81`, a plain-language read, and R² / n / strength stats in mono.
  Wire to the existing `lib/stats.ts` (Pearson r / R²).

### 03 · Dashboard (iPhone) — mobile proof
- `392px` screen, `40px` radius, status bar + pill notch. Body padding `18px`.
- Greeting row (date + "Hi, Javier" + avatar), a **compact Ink hero** with a
  full-width white "Log dose" button, an **adherence strip** (small ring + streak),
  then a "TODAY'S DOSES" eyebrow and stacked dose cards.
- **Bottom tab bar** is the Ink gradient (`#1C1442→#16102E`), 4 tabs (Home active
  white, others `#7E78A6`): Home / Log / Calendar / Metrics. This is the mobile
  equivalent of the desktop rail — same identity. (In the real app this is the
  existing `Sheet` nav collapsed into a tab bar for standalone/PWA width.)

### 04 · Inventory — vial gauges
- Header + violet "Add vial".
- **Ink summary strip:** three mono stats split by hairlines — Active vials `4`,
  Peptide on hand `18,540 mcg`, Next expiry `6 days` (amber) · Tesamorelin.
- **Vial grid (`repeat(3,1fr)`):** each card = **vial gauge** (left) + info
  (right): name (Space Grotesk), status pill, mono concentration, big mono
  remaining mcg + "≈ N doses left · NN%", and an expiry line with an icon.
  States to support: **Active** (violet fill, green pill), **Expires soon**
  (amber fill + card border `#FBE7C2` + "6d left" pill), **Sealed** (desaturated
  half-fill, "Reconstitute" CTA), **Expired** (red, strikethrough value, "Discard
  & archive"), **Empty** (dashed baseline, "Reorder"). Fill % and status come from
  the existing `lib/vials.ts` math.

### 05 · Labs — reference-range instrument
- Header + violet "Add result".
- **Three count tiles:** In range (green check) / Borderline (amber triangle) /
  Out of range (red) — mono counts.
- **Reference-range track list** (white card): each row is a `185px / 1fr / 132px`
  grid — marker name + mono ref range · the **track** (rail + lilac normal band +
  status-colored marker dot) · right-aligned mono value + unit + status label.
  Marker color = status (`--primary` in range, `--warn` high-normal, `--bad`
  above optimal). Positions are computed from `value`, `refLow`, `refHigh`.
- **Single-marker trend** (IGF-1) with the reference band drawn as a shaded
  rect behind the line; the latest point is amber (entered high-normal). Reuse
  `MetricChart`, adding a reference-band layer.

---

## Interactions & behavior
The mockups are static, but the intended behavior maps to existing features:
- Range segmented control → updates `?range` (URL state, as Metrics already does).
- Chart legend chips → toggle series visibility (existing `MetricsTrends`).
- Correlation explorer → pick two series, recompute via `lib/stats.ts`.
- "Log dose" / "New cycle" / "Add vial" / "Add result" → existing server-action
  forms (wrap in `ActionForm` + `SubmitButton`; destructive actions keep undo/
  confirm per the repo conventions).
- Cards/rows that link keep `focus-visible` rings; hover raises card shadow
  slightly (`0 8px 24px -12px rgba(22,16,46,.16)`).
- Honor `prefers-reduced-motion` (already globally handled).
- Keep the **Disclaimer** on peptide/stack/suggestion surfaces (non-negotiable
  policy in the repo).

## Where to implement (codebase map)
- **Tokens:** `src/app/globals.css` `:root` / `.dark` — adjust `--background`,
  `--border`, add `--ok/--warn/--bad/--sealed` + the Ink-panel / gauge gradient
  helpers.
- **New shared primitives** (`src/components/common/`): `InkPanel`,
  `AdherenceRing`, `Sparkline` / `MiniBars`, `VialGauge`, `RangeTrack`,
  `Eyebrow`. Build once, reuse.
- **Screens to restyle:** `src/app/page.tsx` (dashboard) +
  `components/dashboard/*`; `app/metrics` + `components/metrics/*`;
  `app/inventory` + `components/inventory/*`; `app/labs` + `components/labs/*`.
- **Shell / mobile:** `src/components/app-shell.tsx` — keep the desktop
  `brand-rail`; add the Ink bottom tab bar for the mobile/standalone breakpoint.
- Charts use **recharts** (already a dependency); the SVG gauges/tracks are small
  bespoke components.

## Assets
- No raster assets. Icons are **lucide-react** (already used) — the mockup draws
  simplified equivalents; use the real lucide icons in code.
- Fonts already load via `next/font` in `layout.tsx` (Space Grotesk, IBM Plex
  Sans, IBM Plex Mono). The molecule motif and gauges are inline SVG.
- The Peptra mark/logo lives in `src/components/brand/peptra-logo.tsx` — keep it.

## Files
- `Peptra Redesign.dc.html` — the five-frame design reference (open in a browser;
  pan/zoom canvas). Everything above is specified from this file.
