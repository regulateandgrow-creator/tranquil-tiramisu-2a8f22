#!/usr/bin/env bash
# Applies the real migrations to a scratch database on a local PostgreSQL and
# runs the row-level security tests. Needs psql and a superuser connection,
# configured with the usual PG* variables, e.g.
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-rls.sh
#
# Creates and drops a database named grown_rls_test. Never point this at a
# real Supabase project: the auth shim is for local PostgreSQL only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB=grown_rls_test

apply() {
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/local-auth-shim.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  done
}

psql -d postgres -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB;" -c "create database $DB;"
apply
echo "migrations applied: $(ls "$ROOT"/supabase/migrations/*.sql | wc -l)"

# Show the PASS/FAIL notices, then exit with psql's own status.
set +e
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/rls.test.sql" 2>&1 | grep -E "PASS|FAIL|ERROR"
status=${PIPESTATUS[0]}
set -e
psql -d postgres -q -c "drop database if exists $DB;"
if [ "$status" -ne 0 ]; then echo "RLS tests FAILED"; exit "$status"; fi
echo "RLS tests passed"
