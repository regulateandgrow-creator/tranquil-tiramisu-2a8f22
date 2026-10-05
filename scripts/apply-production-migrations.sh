#!/usr/bin/env bash
# Applies supabase/migrations/*.sql to the REAL Supabase database, in order,
# each inside its own transaction. Refuses to run if the schema already exists,
# so it can never overwrite or weaken existing data.
#
#   SUPABASE_DB_URL='postgresql://...' scripts/apply-production-migrations.sh
#
# Never prints the connection string.
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase → Project Settings → Database → connection string)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGCONNECT_TIMEOUT=15

exists=$(psql "$SUPABASE_DB_URL" -tAc "select to_regclass('public.profiles') is not null")
if [ "$exists" = "t" ]; then
  echo "public.profiles already exists. Refusing to apply migrations over an existing schema."
  echo "Run scripts/verify-production-db.sh to check what is there."
  exit 2
fi

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q --single-transaction -f "$f"
done
echo "migrations applied: $(ls "$ROOT"/supabase/migrations/*.sql | wc -l)"
