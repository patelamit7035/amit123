#!/usr/bin/env bash
# Runs the SQL test-suite against a throwaway PostgreSQL cluster.
#
#   npm run test:db
#
# Requires PostgreSQL server binaries (initdb/pg_ctl/psql). If they are not
# installed the script exits 0 with a notice, so it never breaks a plain
# `npm test` run on a machine without Postgres.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
  if command -v initdb >/dev/null 2>&1; then PGBIN="$(dirname "$(command -v initdb)")"; else
    echo "SKIP: PostgreSQL server binaries not found - install postgresql to run the SQL tests."
    exit 0
  fi
fi

DATA_DIR="${PGDATA_DIR:-$(mktemp -d)/pgdata}"
PORT="${PGPORT:-55432}"
SOCKET_DIR="$(dirname "$DATA_DIR")/sock"
mkdir -p "$SOCKET_DIR"

cleanup() {
  "$PGBIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "→ creating a temporary PostgreSQL cluster in $DATA_DIR"
"$PGBIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$DATA_DIR" -o "-p $PORT -k $SOCKET_DIR -c listen_addresses=''" -l "$DATA_DIR/server.log" -w start >/dev/null

export PGHOST="$SOCKET_DIR" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres
PSQL=("$PGBIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc)

echo "→ applying the Supabase shim, the migrations and the tests"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/10_helpers.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "   • $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done

# Applying the migrations twice proves they are re-runnable (Supabase applies
# them once, but a partial failure has to be recoverable by re-running).
for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration" >/dev/null
done
echo "   • migrations are idempotent"

"${PSQL[@]}" -f "$ROOT/supabase/tests/20_affiliate_test.sql"
