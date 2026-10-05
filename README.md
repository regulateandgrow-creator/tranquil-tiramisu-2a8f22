# GROWN.™

**Healthy aging. Your body. Your rules.**

A personalized healthy-aging literacy platform for women 40+. Built with Next.js, React, TypeScript,
Tailwind CSS, and Supabase. See [CLAUDE.md](./CLAUDE.md) for product philosophy, architecture,
design system, safety rules, and feature definitions.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app runs in demo mode with a fictional user until Supabase and
Anthropic credentials are added to `.env.local` (see `.env.example`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build + type check |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## GROWN. Intelligence (Stage 3)

Type a product → confirm the exact variant → choose your goals → get the GROWN. Breakdown.

- Runs only for signed-in accounts, server-side, through a provider adapter (`src/lib/ai/provider/`).
- With `ANTHROPIC_API_KEY` set it uses the real model; with `GROWN_AI_PROVIDER=fixture` it uses scripted
  test data (the page shows a "Scripted test data" badge). See `.env.example` for every setting.
- Database tables, policies, and the retention purge live in `supabase/migrations/20261005000002_intelligence.sql`.
  Retention behaviour is documented in `docs/DATA_RETENTION.md`.

## Tests

| Command | What it covers |
| --- | --- |
| `npm test` | Unit: Hide Weight policy, citation integrity, language lint, limits, product identity, full pipeline on the fixture provider |
| `npm run acceptance` | Gold-standard acceptance (SpoiledChild E27 Extra Strength, magnesium ambiguity, proprietary blend). Real model when `ANTHROPIC_API_KEY` is set; writes `acceptance-output/` |
| `scripts/test-rls.sh` | Row-level security against the real migrations on a local PostgreSQL |
