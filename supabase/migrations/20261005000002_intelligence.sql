-- ============================================================================
-- GROWN.™  Milestone 2 / Stage 3 — GROWN. Intelligence v1 (Type a Product)
--
--   products / product_research  shared, reusable facts (written by the server
--                                with the service role; readable by any
--                                signed-in woman)
--   analyses                     one woman's personal analysis; owner-only
--   usage_events                 per-user analysis counts for limits
--   app_config                   editable settings (limits, cache lifetimes)
--   ai_raw_logs                  short-retention raw diagnostics (expires_at)
-- ============================================================================

-- ---------- app_config ----------------------------------------------------

create table public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
comment on table public.app_config is 'Server-only settings. Env vars override these; code defaults are last.';

insert into public.app_config (key, value) values
  ('analysis_daily_limit',        '5'),   -- private beta default (founder-approved)
  ('limit:beta',                  '5'),   -- tier limits: limit:<tier>
  ('research_ttl_days',           '30'),
  ('pricing_ttl_days',            '7'),
  ('goal_supplement_ttl_days',    '30'),
  ('ai_raw_log_retention_days',   '14');

-- ---------- profiles: tier + per-profile override -------------------------

alter table public.profiles
  add column tier text not null default 'beta',
  add column analysis_limit_override integer
    check (analysis_limit_override is null or analysis_limit_override >= 0);

comment on column public.profiles.tier is 'Resolves to app_config limit:<tier>. Subscription tiers later.';
comment on column public.profiles.analysis_limit_override is 'Per-account override of the daily analysis limit.';

-- ---------- products (resolved identities) ---------------------------------

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  identity_key  text not null unique,     -- hash of normalized brand|name|variant|form
  brand         text not null,
  name          text not null,
  variant       text,
  form          text,
  category      text,
  created_at    timestamptz not null default now()
);

-- ---------- product_research (versioned dossiers) --------------------------

create table public.product_research (
  id                       uuid primary key default gen_random_uuid(),
  product_id               uuid not null references public.products (id) on delete cascade,
  version                  integer not null,
  dossier                  jsonb not null,
  sources                  jsonb not null default '[]'::jsonb,
  formulation_fingerprint  text,
  price_snapshot           jsonb,
  price_observed_at        timestamptz,
  model                    text,
  researched_at            timestamptz not null default now(),
  expires_at               timestamptz not null,
  stale                    boolean not null default false,   -- admin flag: force re-research
  unique (product_id, version)
);
create index product_research_lookup_idx on public.product_research (product_id, version desc);

-- ---------- goal_supplements (cached per product + goal) -------------------

create table public.goal_supplements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  goal_key     text not null,
  supplement   jsonb not null,
  sources      jsonb not null default '[]'::jsonb,
  researched_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  unique (product_id, goal_key)
);

-- ---------- analyses (personal) --------------------------------------------

create table public.analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  product_id     uuid references public.products (id) on delete set null,
  research_id    uuid references public.product_research (id) on delete set null,
  query_text     text not null check (char_length(query_text) between 1 and 200),
  goals          text[] not null default '{}',
  goal_other     text check (goal_other is null or char_length(goal_other) <= 200),
  status         text not null default 'pending'
                 check (status in ('pending','resolving','needs_confirmation','researching','personalizing','complete','failed','limited')),
  stage_message  text,
  candidates     jsonb,          -- resolve step output when confirmation is needed
  result         jsonb,          -- PersonalAnalysis
  error_code     text,
  decision       text check (decision is null or decision in ('try_track','save','not_for_me')),
  decided_at     timestamptz,
  -- structured operational fields (no free text, no wellness detail)
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  latency_ms     integer,
  research_cached boolean,
  validator      jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index analyses_user_idx on public.analyses (user_id, created_at desc);

create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- ---------- usage_events ---------------------------------------------------

create table public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('analysis')),
  analysis_id uuid references public.analyses (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index usage_events_user_time_idx on public.usage_events (user_id, kind, created_at desc);

-- ---------- ai_raw_logs (short retention) ----------------------------------

create table public.ai_raw_logs (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses (id) on delete cascade,
  step        text not null,
  prompt      text,
  raw_output  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index ai_raw_logs_expiry_idx on public.ai_raw_logs (expires_at);

comment on table public.ai_raw_logs is
  'Raw prompts/outputs for debugging only. Rows carry expires_at and are purged by purge_expired_ai_raw_logs().';

create or replace function public.purge_expired_ai_raw_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from public.ai_raw_logs where expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Schedule the purge hourly where pg_cron exists (Supabase). Local test DBs skip it.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-ai-raw-logs', '17 * * * *', 'select public.purge_expired_ai_raw_logs();');
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;

-- ---------- row-level security ---------------------------------------------

alter table public.app_config       enable row level security;
alter table public.products         enable row level security;
alter table public.product_research enable row level security;
alter table public.goal_supplements enable row level security;
alter table public.analyses         enable row level security;
alter table public.usage_events     enable row level security;
alter table public.ai_raw_logs      enable row level security;

revoke all on public.app_config, public.products, public.product_research, public.goal_supplements,
              public.analyses, public.usage_events, public.ai_raw_logs
  from anon, authenticated;

-- Shared facts: any signed-in woman may read; only the server (service role) writes.
grant select on public.products, public.product_research, public.goal_supplements to authenticated;

create policy "products: signed-in can read"
  on public.products for select to authenticated using (true);
create policy "research: signed-in can read"
  on public.product_research for select to authenticated using (true);
create policy "goal supplements: signed-in can read"
  on public.goal_supplements for select to authenticated using (true);

-- Personal analyses: owner only. Inserts and result writes happen server-side
-- as the user; the decision update is the one field she changes directly.
grant select, insert, update on public.analyses to authenticated;

create policy "analyses: owner can read"
  on public.analyses for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "analyses: owner can insert"
  on public.analyses for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "analyses: owner can update"
  on public.analyses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Usage events: owner may read her own; only the server writes (so counts can't be forged).
grant select on public.usage_events to authenticated;
create policy "usage: owner can read"
  on public.usage_events for select to authenticated
  using ((select auth.uid()) = user_id);

-- app_config and ai_raw_logs: server only. No grants, no policies for anon/authenticated.
