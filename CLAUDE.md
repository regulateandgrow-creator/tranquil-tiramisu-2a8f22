# GROWN.™ — Engineering & Product Guide

> **Healthy aging. Your body. Your rules.**

This file is the source of truth for anyone (human or AI) working on the GROWN.™ codebase.
Read it fully before changing product copy, UI, data shapes, or the AI layer.

---

## 1. Product philosophy

GROWN.™ is a **personalized healthy-aging literacy platform for women 40+**.

Core lines (use verbatim, they are brand assets):

- "Your body is the data. Not TikTok.™"
- "Learn your body. Learn your food. Learn what's worth your money."
- "We're not trying to stop aging. We're building a body we can enjoy aging in."

GROWN. helps women develop four literacies:

1. **Nutrition literacy**
2. **Body literacy**
3. **Consumer wellness literacy**
4. **Sustainable healthy-aging habits**

GROWN. is **NOT** primarily: a calorie counter, a diet app, a weight-loss app, a supplement store,
an anti-aging app, a fitness challenge, or a medical diagnostic tool. If a feature idea pushes toward
one of those, stop and reframe it as literacy.

### Product rules (non-negotiable)

- **Weight never dominates the dashboard.** Visually prioritize energy, strength, sleep, nutrition,
  mobility, digestion, consistency, and quality of life.
- **Hide Weight Entirely is a global override, ON by default** (`profiles.hide_weight = true`).
  When on, no screen, prompt, AI context, AI response, recommendation, progress message, notification,
  analysis, or future feature may **request, expose, infer, repeat, or use** the user's body weight.
  Enforce it at the source, never cosmetically:
  - Client UI: wrap anything weight-related in `<WeightSensitive>` (`src/lib/preferences/weight.tsx`)
    or read `useHideWeight()`.
  - Server Components, Route Handlers: read `getPreferences()` (`src/lib/preferences/server.ts`).
  - AI: personal information reaches a prompt only through `buildPersonalContext()`
    (`src/lib/preferences/weight-policy.ts`), which allow-lists the seven non-scale signals and scrubs
    weight from free text; every prompt carries `weightPolicyPromptBlock()`; generated output is scanned
    by `findWeightViolationsDeep()` and regenerated once, then failed closed.
  - Database: `day_check_ins.signals` only accepts the seven approved signals; there is no weight column.
  - Tests: `tests/unit/weight-policy.test.ts` must pass; new features add cases there.
- **Goal selection and weight visibility are separate concepts.** Never remove a weight-related wellness
  goal because Hide Weight Entirely is on. The goal is named **"Body composition & weight support"**
  (never "Weight management"). A woman may want that guidance without weight being displayed, tracked,
  requested, celebrated, inferred, or used in personalization. With the override on, Intelligence reasons
  from non-scale context only: her stated goals, nutrition patterns, strength, movement, energy, sleep,
  satiety, digestion, and other explicitly provided non-weight information.
- **Never make users feel like they failed.** No red failure states in the first version. Status language is
  `Building`, `Steady`, `Needs attention`, `Not logged yet`. Never `Failed`, `Bad`, `Behind`, `Over limit`.
- **Associations, never causation.** Any text derived from the user's logs (Works For Me™) describes patterns
  ("often appears alongside", "has tended to show up next to"). Never "X causes Y" or "X improved Y".
- **Never shame missed workouts, meals, or logs.** Maintenance is progress.
- **Literacy, not diagnosis.** GROWN. Intelligence explains and cites. It never diagnoses, prescribes, or
  tells a user to stop/start medication. Point to a clinician where relevant.
- **Logging takes under a minute.** Every check-in control is a tap, not a form.

### Voice

Warm, grown, intelligent, unhurried. Second person ("you", "we"). Short sentences. No hype, no shame,
no clinical jargon, no influencer tone. Use "we" when the app and the user are working together.

---

## 2. Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Server components, route handlers for server-side AI, Vercel-ready |
| Styling | Tailwind CSS v4 with design tokens in `globals.css` | Fast iteration, consistent system |
| Fonts | Self-hosted via `@fontsource-variable` (Fraunces + DM Sans) | No external font requests, deterministic builds |
| Icons | `lucide-react` | Clean, consistent stroke icons |
| Auth + DB | Supabase (`@supabase/ssr`) | Simple, scalable, row-level security |
| AI | Anthropic Claude API (server-side only) | Vision, text, web search with citations |
| Client state | Tiny external store (`useSyncExternalStore`) + localStorage | Hydration-safe, no extra dependency; becomes the optimistic cache in front of Supabase |

### Folder map

```
src/
  app/
    layout.tsx              Root HTML, metadata, global CSS
    globals.css             Design tokens + base styles
    (app)/                  Authenticated app shell (route group)
      layout.tsx            Wraps pages in <AppShell>
      page.tsx              HOME dashboard
      my-body/ nourish/ move/ intelligence/ progress/
      my-products/ works-for-me/ weekly-body-meeting/ settings/
  components/
    ui/                     Primitives: Card, Button, Chip, Badge, SectionHeading, Wordmark
    navigation/             nav-config, Sidebar (desktop), BottomNav (mobile), MobileHeader
    layout/                 AppShell, PagePlaceholder
    dashboard/              Greeting, IntelligenceHero, MyBodyToday, MyFoundation,
                            WorksForMe, LifeIsLifing, GrownThought
  lib/
    demo/                   Types + fictional demo data (user, foundation, insights, thoughts, modes, signals)
    store/                  day-store (profile prefs + check-in + life mode), actions (server actions),
                            bootstrap (server → initial state), use-hydrated
    db/                     types, validate, profile, check-ins — server-side data access
    preferences/            weight.tsx (client guard), server.ts (server/AI guard)
    supabase/               config, client (browser), server, proxy — all no-op in demo mode
    ai/                     Contracts for GROWN. Intelligence (types.ts, README.md)
    utils/                  cn, date helpers
```

### Data flow

- Pages are Server Components. Interactive cards are Client Components (`"use client"`).
- `src/app/(app)/layout.tsx` resolves the user and calls `getStoreBootstrap()`, which returns the initial
  client state: profile prefs, life mode, and the check-ins around today.
  - **Demo mode** (no Supabase env): static demo defaults; the client merges `localStorage`
    (`grown.day-store.v1`) after hydration.
  - **Live mode:** read from `profiles` and `day_check_ins`. Nothing is written to `localStorage`.
- `DayStoreProvider` (in `AppShell`) owns one store per page tree. Components call `useDayStore()`.
- Writes: demo → `localStorage`; live → server actions in `src/lib/store/actions.ts`, debounced 400ms per
  key with three retries, then a gentle "having trouble saving" notice. Every action re-checks the session
  and validates input with `src/lib/db/validate.ts` before touching the database. RLS is the last line.
- Supabase schema lives in `supabase/migrations/`. Row-level security is tested by `scripts/test-rls.sh`
  against a local PostgreSQL (see §5).
- Future AI requests go through Route Handlers under `src/app/api/intelligence/*`.
  The browser never holds `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

### Data minimization

Stage 2 stores exactly: `first_name`, `hide_weight`, `life_mode`, and per-day `feeling` + the seven
`signals`. Stage 5 adds per-day `nourish` (meal tags from a fixed vocabulary, plant servings, glasses of
water); Stage 6 adds per-day `move` (movement kinds, a duration band, strength areas). Feelings and tags
are chip values, not free text. No distances, calories, heart rate or weight anywhere. Do not add personal or health fields because the
database could hold them; every new field needs a product reason and a line in this file.

---

## 3. Design system

**Feel:** a beautiful private wellness space for a grown woman. Elevated, warm, calm, feminine without
being childish, premium, soft. A personal journal, not software.

**Not:** hospital portal, fitness-bro app, diet tracker, pink influencer app, clinical dashboard,
biohacking lab, weight-loss challenge.

### Colors (tokens in `globals.css`, Tailwind classes via `@theme`)

| Token | Hex | Tailwind | Use |
| --- | --- | --- | --- |
| Warm cream | `#F7F1E8` | `bg-cream` | Page background |
| Warm white | `#FFFDF9` | `bg-warm-white` | Cards |
| Deep espresso | `#332B28` | `text-espresso`, `bg-espresso` | Primary text, primary buttons, hero |
| Charcoal | `#383838` | `charcoal` | Hover on espresso |
| Muted sage | `#A7B29C` | `sage`, `sage-soft` | Steady / positive, Works For Me |
| Dusty rose | `#C58F86` | `rose`, `rose-soft` | Needs attention (gentle), Life Is Lifing |
| Champagne gold | `#D5BA82` | `gold`, `gold-soft` | Accent, Building, Intelligence CTA, Thought |
| Espresso soft | `#6B625D` | `text-espresso-soft` | Secondary text (AA on cream) |

Derived tints (`*-soft`, `cream-deep`, `line`, `line-strong`) are defined once in `:root`. Add new
colors there, never inline hex in components.

### Typography

- **Headings:** Fraunces Variable (editorial serif), `font-serif`, medium weight, tight leading.
- **Body:** DM Sans Variable, base 17px, line-height 1.55.
- Eyebrows: 11–12px, uppercase, `tracking-[0.18em]`, `text-espresso-soft`.

### Shape, depth, motion

- Cards: `rounded-card` (1.5rem), `border-line`, `shadow-card`; hover lifts with `shadow-card-hover`.
- Pills/buttons/chips: `rounded-pill`.
- Soft gradients on tinted cards (`tone="sage" | "rose" | "gold" | "espresso"`).
- Animations: `animate-rise` (enter), `animate-fade`, `animate-breathe`; `.stagger` delays children.
  All motion respects `prefers-reduced-motion`.
- Focus ring is gold (`:focus-visible`), never the browser default.

### Layout

- Desktop (`lg+`): left sidebar 18rem, content `max-w-6xl`.
- Mobile: sticky top wordmark header + fixed bottom nav (5 items, Intelligence raised in the center),
  safe-area padding, `pb-28` on main so content clears the bar.
- Minimum tap target 40px. Horizontal chip rows scroll on mobile, wrap on desktop.

---

## 4. Safety requirements

1. **Secrets stay server-side.** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be
   exposed to the client. `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are never prefixed `NEXT_PUBLIC_`
   and are only read in Route Handlers / Server Actions / server utilities.
2. **No real personal health data in the repo.** The demo user (`src/lib/demo/user.ts`) is fictional.
   Never hard-code the founder's or any real person's health information.
3. **No medical claims.** UI copy and AI output must not diagnose, prescribe, or promise outcomes.
   Product analysis is framed as literacy with citations and a "talk to your clinician if…" section.
4. **Associations only** in anything generated from user logs (see Product rules).
5. **Non-judgmental language** everywhere. Run new copy against the banned list: failed, bad, behind,
   over limit, cheat, guilty, lazy.
6. **Accessibility:** AA contrast, labelled controls (`aria-label`, `role="radio"`, `aria-pressed`),
   keyboard reachable, reduced-motion honoured.

---

## 5. Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server at http://localhost:3000
npm run build        # production build (also runs type checks)
npm run start        # serve the production build
npm run lint         # ESLint (Next + React hooks rules)
npx tsc --noEmit     # standalone type check
npm test             # unit tests (vitest): weight policy, AI validators, limits, pipeline (fixture provider)
npm run acceptance   # gold-standard acceptance run against the REAL provider (needs GROWN_ANTHROPIC_API_KEY)
npm run acceptance:cache-bench   # prompt-caching benchmark on the gold case (real provider)
npx vitest run --config vitest.live.config.mts   # narrow live checks (cents), e.g. manufacturer price fetch

# Row-level security tests (needs a local PostgreSQL superuser; never a real Supabase project)
PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-rls.sh

# Real project, via the Management API (scoped SUPABASE_ACCESS_TOKEN; see docs/SUPABASE_SETUP.md §7)
node scripts/apply-production-migrations.mjs   # applies pending files per the app_migrations ledger (--dry-run to list)
node scripts/verify-production-db.mjs          # schema, RLS, grants, cron + RLS suite rolled back
node tests/production/smoke.mjs                # end-to-end against the real project, fixture AI, self-cleaning
```

Applying the schema to a real project: paste each file in `supabase/migrations/` into the Supabase SQL
editor in order, or use the Supabase CLI (`supabase db push`).

Environment: copy `.env.example` to `.env.local`. Without Supabase/Anthropic values the app runs in
demo mode using local data.

---

## 6. Coding conventions

- TypeScript strict. No `any`. Domain types live in `src/lib/demo/types.ts` (will move to `src/lib/types`
  when Supabase lands; keep the shapes DB-ready).
- Server Components by default; add `"use client"` only to components that use state, effects, or browser APIs.
- Never call `setState` inside `useEffect` for initial data. Use `useSyncExternalStore` (see `use-hydrated.ts`
  and `day-store.tsx`) so SSR and hydration stay in sync.
- Styling: Tailwind utility classes + tokens. Use `cn()` from `src/lib/utils/cn.ts` to compose. No inline hex.
- One component per file, named export, PascalCase file names for components, kebab-case for lib modules.
- Copy lives next to the component that owns it unless it is reused (thoughts, modes, signals live in `lib/demo`).
- Icons: `lucide-react`, `strokeWidth={1.75}`, sized 18px inside 36–44px containers.
- Keep commits small and descriptive. Do not commit `.env*` files.

---

## 7. Feature definitions

### Navigation
Primary: HOME · MY BODY · NOURISH · MOVE · GROWN. INTELLIGENCE · PROGRESS.
Secondary: My Products · Works For Me · Weekly Body Meeting · Settings.
Config: `src/components/navigation/nav-config.ts`.

### Home dashboard (`/`)
1. **Greeting** — "Good morning/afternoon/evening, [First Name] 🌿", "How are we feeling today?", today's date,
   one-tap feeling chips (Rested, Steady, Tired, Stressed, Tender, Motivated, Foggy, Content).
2. **GROWN. Intelligence hero** — "Thinking about buying something? Let's look at it first."
   Buttons: SCAN A PRODUCT (primary, gold) · TYPE A PRODUCT · PASTE A PRODUCT LINK. Links to `/intelligence`.
3. **My Body Today** — 7 compact cards (Energy, Sleep, Hunger, Cravings, Digestion, Mood, Movement), each a
   5-step tap bar with descriptive labels. Tapping the selected level clears it. Persists for the day.
4. **My Foundation** — Protein, Fiber, Hydration, Movement, Sleep with status badges
   (Building / Steady / Needs attention / Not logged yet) and soft progress bars, computed from today's
   own taps (`computeFoundation`). Links to Nourish and Move.
5. **Today's GROWN. Thought** — rotating supportive message, deterministic per day, "Another thought" button.
6. **Works For Me™ preview** — "Here's what your body has been telling us." Three association-only insights
   with category, confidence (Emerging / Consistent) and window. Demo data.
7. **Life Is Lifing™** — mode selector NORMAL ROUTINE / MAINTENANCE / REBUILD. Maintenance copy:
   "We're protecting the foundation right now." Focus chips per mode. Persists.

### GROWN. Intelligence (`/intelligence`) — v1, Type a Product
Flow: type a product → **Resolve** (candidates; she always confirms the exact variant) → goals
("What are you hoping this product will do for you?", multi-select incl. "Body composition & weight support",
plus Other free text) → **Research** (web search → strict Product Dossier, cached per product identity, pricing
refreshed on its own lifetime) → **Personalize** (dossier + her non-scale context → the GROWN. Breakdown) →
decision: TRY IT & TRACK IT / SAVE IT / NOT FOR ME.

Breakdown sections: What It Is → What's Actually In It → What They're Selling You → What the Evidence Says
→ The Catch 👀 → Product Evidence vs Ingredient Evidence → The Money Test 💰 → Your Goal → Goal Fit →
Simpler Options → Ask Your Clinician → GROWN. TAKE (Evidence Fit, Goal Fit, Value, Formula Transparency,
Marketing–Evidence Gap) → one thing learned → sources.

Code: `src/lib/ai/` (config, schemas, prompts, provider adapters, pipeline, citations, lint, limits, logging),
routes under `src/app/api/intelligence/`, UI in `src/components/intelligence/`. Scan and Paste Link are
placeholders. Analyses produced by the fixture provider carry `model = "fixture"` and show a
"Scripted test data" badge.

### My Products (`/my-products`) — Stage 4
A view over her completed analyses; nothing new is stored. One entry per product (repeat analyses fold
together, newest Breakdown linked, newest decision wins), on four shelves: **Still deciding**,
**Trying & tracking**, **Saved for later**, **Not for me**. Each entry shows category, headline,
Evidence-fit and Value verdicts from the GROWN. TAKE, monthly cost only when pricing was confirmed, and a
three-way decision toggle that writes through the existing decision route. Demo mode shows a fictional
read-only shelf. On phones, Settings carries the secondary destinations (`MoreLinks`).
Code: `src/lib/products/my-products.ts` (pure builder, unit-tested), `src/components/products/*`.

### Nourish (`/nourish`) — Milestone 3, Stage 5
Nutrition literacy, not counting: no calories, no grams, no weight. Three tap controls on the existing
per-day row (`day_check_ins.nourish`, validated by `public.nourish_valid`):
- **Today's plate** — four slots (Breakfast, Lunch, Dinner, Snacks & extras), each a row of fixed tags:
  Protein anchor · Colorful plants · Whole grains · Healthy fats · Fermented · Something sweet · A drink ·
  Caffeine · Skipped it. Vocabulary lives in `src/lib/demo/nourish.ts` and must match the SQL function.
- **Plants & water** — two steppers: plant servings 0–8, glasses of water 0–12.
- **Your foundation today** — Protein / Fiber / Hydration computed from the taps
  (`src/lib/foundation/compute.ts`). Protein counts meals with a protein anchor; "Needs attention" only
  when two or more meals are logged without one. Life Is Lifing maintenance/rebuild adds a note that
  fewer taps are plenty. A daily "Learn your food" literacy line (general knowledge, never from her logs).
**My Foundation on Home is real now**: Protein/Fiber/Hydration from Nourish, Movement and Sleep from the
body signals (Move will refine Movement). `demoFoundation` is gone; demo mode computes from on-device taps.

### Move (`/move`) — Milestone 3, Stage 6
Body literacy: everyday movement and strength both count, neither needs a gym. One jsonb column on the
per-day row (`day_check_ins.move`, validated by `public.move_valid`):
- **Today's movement** — kind chips (Walk, Strength, Stretch & mobility, Yoga or Pilates, Cardio,
  Housework & errands, Gardening, Dance, Swim, Cycle, Rest day); a rest day stands alone. Once a kind is
  tapped, a rough duration (a few minutes / 15–30 / 30–60 / an hour or more). When Strength is tapped,
  areas (Legs & glutes, Upper body, Core, Full body, Balance & carries). Vocabulary in `src/lib/demo/move.ts`.
- **A week at a glance** — seven dots from the last seven local days (`src/lib/foundation/week.ts`): moved,
  moved with strength, rest, not noted. Counts only. No streaks, no targets, never "missed".
- **How it felt** — the same Movement body signal as Home (`SignalCard`, extracted from MyBodyToday).
- **Movement and rest today** — Movement and Sleep pillars. Movement prefers Move taps over the signal:
  strength or 15+ minutes → Steady, a few minutes → Building, rest day → Building with recovery copy.
- Life Is Lifing note and a daily "Learn your body" literacy line (general knowledge, never from logs).
The store now fetches the past 7 days of check-ins (was ±1) so the strip has data in live mode.

### Settings (`/settings`)
First name (saved on submit), **Hide weight entirely** switch (saved immediately, default on), a
"More of GROWN." link list on phones, account card with email and sign-out (live mode), and a plain
"What we keep" list. Demo mode saves on-device.

### Placeholder routes
My Body, Progress, Works For Me, Weekly Body Meeting render
`<PagePlaceholder>` with their positioning copy and target milestone.

---

## 8. Milestone 2 decisions (approved by founder)

Build order, one commit per tested stage: **Accounts → Persistence + Settings → GROWN. Intelligence v1 → My Products.**
Intelligence v1 ships **Type a Product first**; Paste a Link starts only after typed analysis passes founder testing.
Camera scanning is Milestone 3.

- **Auth:** Supabase email magic link only. Transactional email stays plain. No welcome/marketing sequences yet.
- **Demo mode:** with no Supabase env vars the app runs on local demo data and never breaks.
- **Usage limits:** resolved server-side in this order: per-profile override → tier limit → global default.
  Private-beta default is **5 analyses per user per day**, stored in `app_config` with env override
  `GROWN_ANALYSIS_DAILY_LIMIT`. Never hard-code the number in product code.
- **Caching:** product identity key = normalized brand + product name + variant + form. Dossiers are versioned
  rows with a formulation fingerprint; analyses point at the dossier version they used. Lifetimes are
  configurable: research (30d), pricing (7d), goal supplement (30d).
- **Facts vs. personalization:** `product_research` is shared and cacheable; `analyses` are per user and
  never served to another user.
- **Citations:** every citation URL must have been returned by web search in the same pipeline run;
  anything else is dropped and the claim is marked "source not confirmed". Manufacturer domains are only
  allowed in claims / product-fact / pricing sections. Require the strongest relevant independent evidence
  available. **No numeric citation quota.** Never add weaker or irrelevant sources to fill a count.
- **AI debugging logs (data minimization):** raw prompts and raw model outputs are retained only for a short,
  configurable window (`GROWN_AI_RAW_LOG_RETENTION_DAYS`, beta default 14) and then deleted by a scheduled
  job. Durable operational logs are structured and contain only: user id, analysis id, product identity,
  model, token usage, latency, validator results, and error codes. No free-text goals or wellness details in
  durable logs. Revisit before public launch (see `docs/DATA_RETENTION.md` once written).
- **Model:** configured in one place (`src/lib/ai/config.ts`) with env override; a startup check against the
  Models endpoint must confirm availability. Current choice: Claude Opus 5.5 for research and personalization.
- **Acceptance test:** SpoiledChild E27 Extra Strength Liquid Collagen, goals skin/healthy aging, hair/nails,
  joints. Scripted, run three times, reviewed as the rendered page. Plus two controls: a bare ingredient
  (must ask for clarification) and a proprietary-blend product (must flag undisclosed doses).
  Rubric taxonomy (founder-approved): exact identity passes when a strength/designation is correctly
  represented in the canonical identity, whether in the product name or a distinct manufacturer-defined
  variant. Never force strength into the variant field to satisfy the test.

### Live-validation corrections (2026-10-05, founder-approved)

Found by the first real-model run and fixed in code; the fixture provider could not have caught 1 or 2.

1. **Structured output limits:** `maxItems` is rejected; the full dossier schema is rejected as "compiled
   grammar too large". Extraction runs as two calls (`dossierCoreSchema` + `pricingSchema`) and merges.
2. **Citation validator:** only manufacturer and retailer hosts are excluded from evidence sections.
   Unrecognized hosts (journals the tier list does not know) survive; tiering is reporting only.
3. **Resolve prompt:** list only variants the brand actually sells; strength designations belong in the name.
4. **Research prompt:** at most 3 of the 8 searches for identity/label/price, at least 5 for independent
   evidence; price from the manufacturer page first. The pricing extraction prefers manufacturer URLs.
5. **`normalizeDossier()`:** empty ingredient amounts become "not disclosed" (disclosed=false); the money
   arithmetic is recomputed from price, servings and servings/day.
6. **Personalize:** goal labels are mapped back to goal keys; the diagnosis lint ignores conditional
   cautions ("if you have a thyroid condition…").
7. **Prompt caching, kept after measurement.** Top-level `cache_control` on research calls. Benchmark
   (`npm run acceptance:cache-bench`, same gold case, 2026-10-05): off $3.07 / 449 s; on $1.26 / 390 s;
   research input 490,638 fresh tokens → 24 fresh + 211,232 cache reads + 45,974 cache writes; tier-1
   sources 17 → 25; manufacturer price used; one personalize attempt; all verification items pass.
   ON by default; `GROWN_AI_PROMPT_CACHE=off` disables. Re-benchmark after any research-prompt change.

Measured live after corrections (Opus 5.5): first analysis $1.26–3.07 and 6.5–7.5 min (research ~215 s,
extract ~72 s, personalize ~80 s per attempt); cached personalization of the same product $0.44 and
~2.3 min. Proprietary-blend control (Alpha BRAIN) $1.72 / ~5 min. Report both costs separately.

Follow-ups applied after founder approval (2026-10-05):
- **Manufacturer-page price fetch fallback.** When the brand page was retrieved but the search snippet
  exposed no usable manufacturer price, the pricing step opens the page with the web fetch tool
  (`web_fetch_20260209`, allowed domains = the brand's hosts) and reads the price from it. A price is
  accepted only if it cites a URL that was actually fetched and is a manufacturer host; otherwise the
  existing fallback stands and pricing may remain "unavailable". Never infers. Outcome recorded in
  `validator.citations.pricingFetch`. Live check: `npx vitest run --config vitest.live.config.mts`
  (a few cents) read a verified $49 one-time price from spoiledchild.com.
- **Regeneration check ids.** `validator.regenerationIssueIds` lists the check identifiers that forced a
  personalize regeneration (ids only, never draft text), also emitted on the `analysis.complete` ops line.
- **Rubric taxonomy:** an unambiguous reference to the canonical product identity (e.g. "E27", the product
  name, "this bottle") counts as "this product" in the product-vs-ingredient check; an ingredient-side
  reference is still required, so generic ingredient prose cannot pass it.

### Stage 3.5 — production Supabase readiness (2026-10-06, applied with founder approval)

- Both migrations applied to the real project (PostgreSQL 17) through the Management API, each in one
  transaction; verified: 9 tables with RLS, 14 policies, 4 triggers, 4 functions, 6 `app_config` rows,
  hourly `purge-ai-raw-logs` cron job, anon has no table privileges, `app_config`/`ai_raw_logs` are
  server-only. The 26-assertion RLS suite ran against production inside a rolled-back transaction.
- Production smoke test (`tests/production/smoke.mjs`): 52 checks, fixture provider, two throwaway users
  at desktop and mobile widths, all rows verified in the database, everything deleted afterwards.
- Magic link: Supabase now requires custom SMTP before email templates can be edited, so the private beta
  uses the default template. `/auth/confirm` accepts both the default `?code=` link (same-browser only)
  and the custom `?token_hash=` link. Editing the template is an optional later step.
- Cloud sessions cannot open raw database connections; use the Management API scripts and a scoped token.
  `SUPABASE_DB_URL` belongs on a laptop only.

### Stage 5 production (2026-10-07, applied with founder approval)

- `20261007000003_nourish.sql` applied through the ledger-aware applier; verified: 10 tables with RLS,
  `nourish` jsonb column + `nourish_valid()`, ledger lists all three files; the 32-assertion RLS suite ran
  against production rolled back; production smoke test 55 checks (now including Nourish taps) passed and
  cleaned up. `tests/production/smoke.mjs` needs `playwright` resolvable from the repo (not a dependency).

## 9. Roadmap

- **Milestone 1 (done):** shell, design system, navigation, Home dashboard, check-in, foundation,
  Works For Me preview, Life Is Lifing, Thought, Intelligence placeholder.
- **Milestone 2 (done):** Supabase auth + persistence (check-ins, life mode, profile incl. hide-weight),
  Settings, GROWN. Intelligence v1 (Type a Product via server route with citations), My Products shelf.
  Paste a Link and camera scanning move to Milestone 3.
- **Milestone 3:** Nourish (done, Stage 5), Move (done, Stage 6), camera scanning and Paste a Link for
  Intelligence (Stage 7).
- **Milestone 4:** Progress, Works For Me™ pattern engine over real logs, Weekly Body Meeting.
