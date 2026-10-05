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

- **Weight never dominates the dashboard.** It is optional, off by default (`demoUser.showWeight = false`),
  and users must eventually be able to hide it entirely. Visually prioritize energy, strength, sleep,
  nutrition, mobility, digestion, consistency, and quality of life.
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
    store/                  day-store (check-in + life mode), use-hydrated
    supabase/               client.ts (browser), server.ts (server) — both return null until env vars exist
    ai/                     Contracts for GROWN. Intelligence (types.ts, README.md)
    utils/                  cn, date helpers
```

### Data flow (Milestone 1)

- Pages are Server Components. Interactive cards are Client Components (`"use client"`).
- Demo data is imported statically from `src/lib/demo/*`.
- Today's check-in and life mode live in `src/lib/store/day-store.tsx`, persisted to `localStorage`
  under `grown.day-store.v1`. The server snapshot is always the empty default so SSR markup matches.

### Future data flow

- Supabase tables mirror `src/lib/demo/types.ts` (`day_check_ins`, `foundation_logs`, `life_mode`, `products`, `insights`).
- All AI requests go through Next.js Route Handlers under `src/app/api/intelligence/*`.
  The browser never holds `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

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
```

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
   (Building / Steady / Needs attention / Not logged yet) and soft progress bars. Demo data.
5. **Today's GROWN. Thought** — rotating supportive message, deterministic per day, "Another thought" button.
6. **Works For Me™ preview** — "Here's what your body has been telling us." Three association-only insights
   with category, confidence (Emerging / Consistent) and window. Demo data.
7. **Life Is Lifing™** — mode selector NORMAL ROUTINE / MAINTENANCE / REBUILD. Maintenance copy:
   "We're protecting the foundation right now." Focus chips per mode. Persists.

### GROWN. Intelligence (`/intelligence`) — placeholder in Milestone 1
Explains the three inputs (scan / type / link) and the three promises (what it is / what the evidence says /
worth your money). Engine contract: `src/lib/ai/types.ts`.

### Placeholder routes
My Body, Nourish, Move, Progress, My Products, Works For Me, Weekly Body Meeting, Settings render
`<PagePlaceholder>` with their positioning copy and target milestone.

---

## 8. Roadmap

- **Milestone 1 (done):** shell, design system, navigation, Home dashboard, check-in, foundation,
  Works For Me preview, Life Is Lifing, Thought, Intelligence placeholder.
- **Milestone 2:** Supabase auth + persistence (check-ins, life mode, profile incl. hide-weight), Settings,
  GROWN. Intelligence v1 (type + link analysis via server route with citations), My Products list.
- **Milestone 3:** Nourish (meals, protein/fiber/hydration logging), Move (everyday movement + strength),
  image scanning via Claude vision.
- **Milestone 4:** Progress, Works For Me™ pattern engine over real logs, Weekly Body Meeting.
