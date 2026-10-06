-- ============================================================================
-- GROWN.™  Milestone 4 / Stage 10 — Weekly Body Meeting
--
--   * One row per person per week: the intention she chose for the week ahead
--     and, later, how last week's intention felt. Both are chips from a fixed
--     vocabulary. No free text, no notes, no scores.
-- ============================================================================

create table public.weekly_meetings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  week_start  date not null,                        -- Monday of the week the meeting reviews
  intention   text check (intention is null or intention in
                ('protein_breakfast','more_plants','water_with_meals','daily_walk','one_strength','earlier_nights','keep_as_is')),
  reflection  text check (reflection is null or reflection in ('stuck','partly','life_happened')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

comment on table public.weekly_meetings is 'Weekly Body Meeting: one intention for the week ahead and one reflection on it, fixed vocabulary.';

create index weekly_meetings_user_week_idx on public.weekly_meetings (user_id, week_start desc);

create trigger weekly_meetings_set_updated_at
  before update on public.weekly_meetings
  for each row execute function public.set_updated_at();

alter table public.weekly_meetings enable row level security;
revoke all on public.weekly_meetings from anon, authenticated;
grant select, insert, update, delete on public.weekly_meetings to authenticated;

create policy "meetings: owner can read"   on public.weekly_meetings for select to authenticated using ((select auth.uid()) = user_id);
create policy "meetings: owner can insert" on public.weekly_meetings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meetings: owner can update" on public.weekly_meetings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meetings: owner can delete" on public.weekly_meetings for delete to authenticated using ((select auth.uid()) = user_id);

insert into public.app_migrations (name) values ('20261009000005_weekly_meetings.sql') on conflict do nothing;
