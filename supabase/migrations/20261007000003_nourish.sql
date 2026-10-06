-- ============================================================================
-- GROWN.™  Milestone 3 / Stage 5 — Nourish: today's plate, plants, water
--
--   * Nutrition literacy, not counting. No calories, no grams, no weight.
--   * One jsonb column on the existing per-day row; validated at the database.
--   * A small migration ledger so later migrations can be applied safely
--     from environments without a direct database connection.
-- ============================================================================

-- ---------- migration ledger (server-only) ----------------------------------

create table if not exists public.app_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);
comment on table public.app_migrations is 'Which files in supabase/migrations have been applied here.';
revoke all on public.app_migrations from anon, authenticated;
alter table public.app_migrations enable row level security;

insert into public.app_migrations (name) values
  ('20261005000001_profiles_and_check_ins.sql'),
  ('20261005000002_intelligence.sql')
on conflict do nothing;

-- ---------- nourish ---------------------------------------------------------

-- Shape: { plants: 0..8, water: 0..12, meals: { breakfast|lunch|dinner|snacks: [tag, ...] } }
-- Tags are a fixed vocabulary. No free text ever reaches this column.
create or replace function public.nourish_valid(n jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(n) = 'object'
     and not exists (
       select 1 from jsonb_object_keys(n) as k where k not in ('plants','water','meals')
     )
     and (
       n->'plants' is null
       or (jsonb_typeof(n->'plants') = 'number'
           and (n->>'plants')::numeric = trunc((n->>'plants')::numeric)
           and (n->>'plants')::numeric between 0 and 8)
     )
     and (
       n->'water' is null
       or (jsonb_typeof(n->'water') = 'number'
           and (n->>'water')::numeric = trunc((n->>'water')::numeric)
           and (n->>'water')::numeric between 0 and 12)
     )
     and (
       n->'meals' is null
       or (
         jsonb_typeof(n->'meals') = 'object'
         and not exists (
           select 1 from jsonb_each(n->'meals') as kv(key, value)
           where kv.key not in ('breakfast','lunch','dinner','snacks')
              or jsonb_typeof(kv.value) <> 'array'
         )
         and not exists (
           select 1
           from jsonb_each(n->'meals') as kv(key, value),
                jsonb_array_elements(kv.value) as t
           where jsonb_typeof(t) <> 'string'
              or (t #>> '{}') not in ('protein','plants','grains','fats','fermented','sweet','drink','caffeine','skipped')
         )
         and not exists (
           select 1 from jsonb_each(n->'meals') as kv(key, value)
           where (select count(*) from jsonb_array_elements_text(kv.value))
              <> (select count(distinct x) from jsonb_array_elements_text(kv.value) as x)
         )
       )
     );
$$;

alter table public.day_check_ins
  add column nourish jsonb not null default '{}'::jsonb
    check (public.nourish_valid(nourish));

comment on column public.day_check_ins.nourish is 'Nourish: meal tags per slot, plant servings, glasses of water. Fixed vocabulary only.';

insert into public.app_migrations (name) values ('20261007000003_nourish.sql') on conflict do nothing;
