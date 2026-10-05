-- ============================================================================
-- GROWN.™  Milestone 2 / Stage 2 — profiles, daily check-ins, Life Is Lifing™
--
-- Principles encoded here:
--   * Data minimization: only the fields the approved scope needs.
--   * Hide Weight Entirely is a product-level preference, default ON.
--   * Row-level security: a woman can only ever see or change her own rows.
--   * Server-only writes are not needed for these two tables; the owner writes.
-- ============================================================================

-- ---------- helpers ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The seven body signals, each 1–5. Anything else is rejected at the database.
create or replace function public.signals_valid(s jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(s) = 'object'
     and not exists (
       select 1
       from jsonb_each(s) as kv(key, value)
       where kv.key not in ('energy','sleep','hunger','cravings','digestion','mood','movement')
          or jsonb_typeof(kv.value) <> 'number'
          or (kv.value)::text::numeric not in (1,2,3,4,5)
     );
$$;

-- ---------- profiles ------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text check (first_name is null or char_length(first_name) between 1 and 60),
  -- Product-level preference. TRUE means weight is never surfaced anywhere.
  hide_weight boolean not null default true,
  life_mode   text not null default 'normal'
              check (life_mode in ('normal','maintenance','rebuild')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles is 'One row per account. Minimal by design.';
comment on column public.profiles.hide_weight is 'Hide Weight Entirely. Default true. Every feature must respect it.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row the moment an account exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- day_check_ins -------------------------------------------------

create table public.day_check_ins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  feeling     text check (feeling is null or char_length(feeling) between 1 and 40),
  signals     jsonb not null default '{}'::jsonb check (public.signals_valid(signals)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day)
);

comment on table public.day_check_ins is 'My Body Today: one row per person per local day.';

create index day_check_ins_user_day_idx on public.day_check_ins (user_id, day desc);

create trigger day_check_ins_set_updated_at
  before update on public.day_check_ins
  for each row execute function public.set_updated_at();

-- ---------- row-level security -------------------------------------------

alter table public.profiles      enable row level security;
alter table public.day_check_ins enable row level security;

-- Supabase grants broad table privileges to anon/authenticated by default.
-- Make the grants explicit and minimal; RLS then narrows to the owner's rows.
revoke all on public.profiles      from anon, authenticated;
revoke all on public.day_check_ins from anon, authenticated;

grant select, insert, update          on public.profiles      to authenticated;
grant select, insert, update, delete  on public.day_check_ins to authenticated;

-- profiles: owner only. No delete policy: profiles go away with the account.
create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: owner can insert"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- day_check_ins: owner only, including delete (she may clear a day).
create policy "check-ins: owner can read"
  on public.day_check_ins for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "check-ins: owner can insert"
  on public.day_check_ins for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "check-ins: owner can update"
  on public.day_check_ins for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "check-ins: owner can delete"
  on public.day_check_ins for delete to authenticated
  using ((select auth.uid()) = user_id);
