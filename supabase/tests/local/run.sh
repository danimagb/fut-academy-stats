#!/usr/bin/env bash
# Runs the migration and the RLS tests on a throwaway local Postgres 16 cluster.
# Needs: Postgres 16 server binaries and pgTAP (Debian/Ubuntu: postgresql-16 postgresql-16-pgtap).
# Usage: supabase/tests/local/run.sh        (exit code 0 = all tests passed)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
supabase_dir="$(cd "$here/../.." && pwd)"
pg_bin="${PG_BIN:-/usr/lib/postgresql/16/bin}"
port="${PGTEST_PORT:-54329}"
db=fut_test

tmp="$(mktemp -d)"
data="$tmp/data"

# Postgres refuses to run as root: run the server as the postgres user in that case.
as_server_user() {
  if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi
}
[ "$(id -u)" = 0 ] && chown postgres "$tmp" && chmod 755 "$tmp"

cleanup() {
  as_server_user "$pg_bin/pg_ctl" -D "$data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

as_server_user "$pg_bin/initdb" -D "$data" -U postgres --auth=trust >/dev/null
as_server_user "$pg_bin/pg_ctl" -D "$data" -l "$tmp/server.log" -w \
  -o "-p $port -k $tmp -c listen_addresses=''" start >/dev/null

export PGHOST="$tmp" PGPORT="$port" PGUSER=postgres PGOPTIONS="-c client_min_messages=warning"
psql_q() { "$pg_bin/psql" -X -q -v ON_ERROR_STOP=1 "$@"; }

psql_q -d postgres -c "create database $db"
psql_q -d "$db" -c "create extension pgtap"
psql_q -d "$db" -f "$here/supabase_stub.sql"
for m in "$supabase_dir"/migrations/*.sql; do
  echo "Applying $(basename "$m")"
  psql_q -d "$db" -f "$m"
  # Applying it a second time checks that the migration is re-runnable.
  psql_q -d "$db" -f "$m"
done

tests=("$supabase_dir"/tests/*.test.sql)
if command -v pg_prove >/dev/null; then
  pg_prove --psql-bin "$pg_bin/psql" -d "$db" "${tests[@]}"
else
  status=0
  for t in "${tests[@]}"; do
    echo "# $(basename "$t")"
    out="$(psql_q -d "$db" -A -t -f "$t" 2>&1)" || status=1
    echo "$out"
    if grep -q '^not ok' <<<"$out" || grep -q 'Looks like' <<<"$out"; then status=1; fi
  done
  exit "$status"
fi
