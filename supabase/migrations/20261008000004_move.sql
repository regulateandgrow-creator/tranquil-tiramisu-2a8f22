-- ============================================================================
-- GROWN.™  Milestone 3 / Stage 6 — Move: everyday movement and strength
--
--   * Movement literacy: what kind, roughly how long, and whether strength
--     happened. No distances, no calories, no heart-rate, no weight.
--   * One jsonb column on the existing per-day row; validated at the database.
-- ============================================================================

-- Shape: { kinds: [kind, ...], duration: 'few'|'short'|'medium'|'long', strength: [area, ...] }
create or replace function public.move_valid(m jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(m) = 'object'
     and not exists (
       select 1 from jsonb_object_keys(m) as k where k not in ('kinds','duration','strength')
     )
     and (
       m->'kinds' is null
       or (
         jsonb_typeof(m->'kinds') = 'array'
         and not exists (
           select 1 from jsonb_array_elements(m->'kinds') as t
           where jsonb_typeof(t) <> 'string'
              or (t #>> '{}') not in ('walk','strength','stretch','yoga','cardio','chores','garden','dance','swim','cycle','rest')
         )
         and (select count(*) from jsonb_array_elements_text(m->'kinds'))
             = (select count(distinct x) from jsonb_array_elements_text(m->'kinds') as x)
       )
     )
     and (
       m->'duration' is null
       or (jsonb_typeof(m->'duration') = 'string' and (m->>'duration') in ('few','short','medium','long'))
     )
     and (
       m->'strength' is null
       or (
         jsonb_typeof(m->'strength') = 'array'
         and not exists (
           select 1 from jsonb_array_elements(m->'strength') as t
           where jsonb_typeof(t) <> 'string'
              or (t #>> '{}') not in ('legs','upper','core','full','balance')
         )
         and (select count(*) from jsonb_array_elements_text(m->'strength'))
             = (select count(distinct x) from jsonb_array_elements_text(m->'strength') as x)
       )
     );
$$;

alter table public.day_check_ins
  add column move jsonb not null default '{}'::jsonb
    check (public.move_valid(move));

comment on column public.day_check_ins.move is 'Move: movement kinds, rough duration, strength areas. Fixed vocabulary only.';

insert into public.app_migrations (name) values ('20261008000004_move.sql') on conflict do nothing;
