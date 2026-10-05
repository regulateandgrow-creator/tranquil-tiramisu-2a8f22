#!/usr/bin/env bash
# Verifies the REAL Supabase database after migration:
#   1. expected tables exist with row-level security enabled, policies, triggers, functions, config rows
#   2. the full RLS test suite runs against the real schema inside a transaction that is ROLLED BACK,
#      so no test users or rows persist
#
#   SUPABASE_DB_URL='postgresql://...' scripts/verify-production-db.sh
#
# Never prints the connection string.
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGCONNECT_TIMEOUT=15

echo "== schema"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       (select count(*) from pg_indexes i where i.schemaname = 'public' and i.tablename = c.relname) as indexes
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relname in ('profiles','day_check_ins','app_config','products','product_research','goal_supplements','analyses','usage_events','ai_raw_logs')
order by 1;
select tgname as trigger_name, tgrelid::regclass as on_table from pg_trigger
where tgname in ('on_auth_user_created','profiles_set_updated_at','day_check_ins_set_updated_at','analyses_set_updated_at');
select proname as function_name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in ('set_updated_at','signals_valid','handle_new_user','purge_expired_ai_raw_logs');
select key, value from public.app_config order by key;
select exists(select 1 from cron.job where jobname = 'purge-ai-raw-logs') as raw_log_purge_scheduled;
SQL

echo "== grants to anon/authenticated on GROWN tables (expected: none for anon)"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
  and table_name in ('profiles','day_check_ins','app_config','products','product_research','goal_supplements','analyses','usage_events','ai_raw_logs')
group by 1,2 order by 1,2;"

echo "== RLS test suite (real schema, inside a transaction, rolled back)"
set +e
{ echo "begin;"; cat "$ROOT/supabase/tests/rls.test.sql" | grep -v '^\\set'; echo "rollback;"; } \
  | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q 2>&1 | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:.*NOTICE:  //'
status=${PIPESTATUS[1]}
set -e
if [ "$status" -ne 0 ]; then echo "RLS verification FAILED (transaction rolled back; nothing persisted)"; exit "$status"; fi
echo "RLS verification passed; transaction rolled back, nothing persisted"
echo "== leftover test users (expected 0)"
psql "$SUPABASE_DB_URL" -tAc "select count(*) from auth.users where email in ('ana@example.com','bea@example.com','cara@example.com','dee@example.com')"
