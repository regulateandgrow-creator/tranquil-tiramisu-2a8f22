# Data retention — GROWN. Intelligence (private beta)

Revisit before public launch. Current behaviour, as implemented in Stage 3.

## What is kept, and for how long

| Data | Where | Retention | Contains personal wellness detail? |
| --- | --- | --- | --- |
| Product research dossiers (shared facts) | `product_research` | Versioned, kept; lifetime for cache use is `research_ttl_days` (30) | No. Nothing about any user. |
| Pricing snapshots | `product_research.price_snapshot` | Refreshed after `pricing_ttl_days` (7) | No |
| Her personal analyses | `analyses` | Kept while her account exists; deleted with the account | Yes: goals, "in her words" text, the Breakdown |
| Structured operational fields | `analyses` row | Same as above | No: model, token counts, latency, cached flag, validator summary, error code |
| Usage events | `usage_events` | Kept while her account exists (counts the rolling 24h limit) | No |
| Raw AI prompts and outputs | `ai_raw_logs` | **Short, configurable**: `ai_raw_log_retention_days` (beta default 14), then purged | Yes, by nature (prompts include goals and the dossier). Hence the short window. |
| Server console lines | hosting logs | Hosting provider's default | No: `opsLine()` emits only ids, codes, counts and timings |

## How purging works

- Every `ai_raw_logs` row is written with `expires_at = now + retention`.
- `public.purge_expired_ai_raw_logs()` deletes expired rows. On Supabase it is scheduled hourly with pg_cron by the migration; the app also purges opportunistically on every raw write, so retention holds even without pg_cron.
- Set `GROWN_AI_RAW_LOGS=off` to stop writing raw logs entirely. Set `GROWN_AI_RAW_LOG_RETENTION_DAYS` (or the `app_config` row) to change the window.

## Data minimization rules in force

- Personal information reaches an AI prompt only through `buildPersonalContext()`, which allow-lists the seven non-scale signals and scrubs weight from free text when Hide Weight Entirely is on.
- The Breakdown is stored per user and is never served to another user (row-level security, tested).
- Shared dossiers never contain user data.

## Open items before public launch

- Decide whether completed analyses should expire after N months of inactivity.
- Decide whether raw logs should be disabled entirely outside of active debugging.
- Add an account-deletion flow in Settings (today deletion is done by an operator; cascades are tested).
