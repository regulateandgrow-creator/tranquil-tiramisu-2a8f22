-- Row-level security tests for profiles and day_check_ins.
-- Run with scripts/test-rls.sh. Every block raises on failure, so psql's
-- ON_ERROR_STOP turns any regression into a non-zero exit.

\set ON_ERROR_STOP on
\set QUIET on

-- Two accounts. The trigger should create both profiles.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ana@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bea@example.com');

do $$
begin
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'FAIL: trigger did not create one profile per user';
  end if;
  if (select bool_and(hide_weight) from public.profiles) is not true then
    raise exception 'FAIL: hide_weight must default to true';
  end if;
  if (select bool_and(life_mode = 'normal') from public.profiles) is not true then
    raise exception 'FAIL: life_mode must default to normal';
  end if;
  raise notice 'PASS: profiles auto-created with hide_weight=true, life_mode=normal';
end $$;

-- ---- Act as Ana -----------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

do $$
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: Ana can see % profiles, expected 1', (select count(*) from public.profiles);
  end if;
  if (select id from public.profiles) <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
    raise exception 'FAIL: Ana sees a profile that is not hers';
  end if;
  raise notice 'PASS: Ana reads only her own profile';
end $$;

update public.profiles set first_name = 'Ana', life_mode = 'maintenance', hide_weight = false
 where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Trying to update Bea's profile must silently affect zero rows.
do $$
declare n int;
begin
  update public.profiles set first_name = 'Hacked' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: Ana updated Bea''s profile'; end if;
  raise notice 'PASS: Ana cannot update Bea''s profile';
end $$;

insert into public.day_check_ins (user_id, day, feeling, signals)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-05', 'Rested', '{"energy":4,"sleep":5}');

-- Upsert path the app uses.
insert into public.day_check_ins (user_id, day, feeling, signals)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-05', 'Steady', '{"energy":3}')
on conflict (user_id, day) do update set feeling = excluded.feeling, signals = excluded.signals;

do $$
begin
  if (select signals->>'energy' from public.day_check_ins where day = '2026-10-05') <> '3' then
    raise exception 'FAIL: upsert did not replace signals';
  end if;
  raise notice 'PASS: Ana can insert and upsert her own check-in';
end $$;

-- Inserting a row for Bea must be rejected by the insert policy.
do $$
begin
  begin
    insert into public.day_check_ins (user_id, day) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-05');
    raise exception 'FAIL: Ana inserted a check-in for Bea';
  exception when insufficient_privilege then
    raise notice 'PASS: Ana cannot insert a check-in for Bea';
  end;
end $$;

-- Data shape is enforced: unknown signal keys and out-of-range values fail.
do $$
begin
  begin
    insert into public.day_check_ins (user_id, day, signals)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-06', '{"weight":150}');
    raise exception 'FAIL: unknown signal key was accepted';
  exception when check_violation then
    raise notice 'PASS: unknown signal key rejected (no weight sneaks in)';
  end;
  begin
    insert into public.day_check_ins (user_id, day, signals)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2026-10-06', '{"energy":9}');
    raise exception 'FAIL: out-of-range signal accepted';
  exception when check_violation then
    raise notice 'PASS: out-of-range signal rejected';
  end;
  begin
    update public.profiles set life_mode = 'vacation' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'FAIL: invalid life_mode accepted';
  exception when check_violation then
    raise notice 'PASS: invalid life_mode rejected';
  end;
end $$;

-- ---- Act as Bea -----------------------------------------------------------
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);

do $$
begin
  if (select count(*) from public.day_check_ins) <> 0 then
    raise exception 'FAIL: Bea can see Ana''s check-ins';
  end if;
  if (select first_name from public.profiles) is not null then
    raise exception 'FAIL: Bea sees Ana''s profile data';
  end if;
  raise notice 'PASS: Bea sees none of Ana''s rows';
end $$;

do $$
declare n int;
begin
  delete from public.day_check_ins where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: Bea deleted Ana''s check-in'; end if;
  raise notice 'PASS: Bea cannot delete Ana''s check-ins';
end $$;

-- ---- Anonymous ------------------------------------------------------------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
begin
  begin
    perform * from public.profiles;
    raise exception 'FAIL: anon can read profiles';
  exception when insufficient_privilege then
    raise notice 'PASS: anon has no access to profiles';
  end;
  begin
    perform * from public.day_check_ins;
    raise exception 'FAIL: anon can read check-ins';
  exception when insufficient_privilege then
    raise notice 'PASS: anon has no access to check-ins';
  end;
end $$;

reset role;

-- ---- Account deletion cascades ---------------------------------------------
delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if exists (select 1 from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     or exists (select 1 from public.day_check_ins where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then
    raise exception 'FAIL: deleting the account left data behind';
  end if;
  raise notice 'PASS: deleting an account removes her profile and check-ins';
end $$;
