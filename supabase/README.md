# Supabase (cloud sync backend)

Database schema and security rules for cloud sync. The design is in
[`docs/cloud-sync-plan.md`](../docs/cloud-sync-plan.md).

- `migrations/`: SQL migrations, applied in file-name order.
  `20261102000000_cloud_sync_schema.sql` creates `teams`, `team_members`, `players`, `games`
  and `ping`, the triggers (server-side `updated_at`, creator becomes director, a team always
  keeps a director) and the Row Level Security policies.
- `tests/rls.test.sql`: pgTAP tests that act as anonymous, director, coach and outsider users
  and check what each can read and change.
- `tests/local/`: runs the migration and the tests on a plain local Postgres, without Supabase.

## Applying to the Supabase project

Either paste the migration into the dashboard's SQL editor and run it, or, with the Supabase
CLI linked to the project, run `supabase db push`.

## Running the tests

With the Supabase CLI and a local Supabase stack (`supabase start`): `supabase test db`.

Without Supabase, on a machine with Postgres 16 and pgTAP (Debian/Ubuntu packages
`postgresql-16` and `postgresql-16-pgtap`; both are in the Claude cloud sessions):

```sh
supabase/tests/local/run.sh
```

It starts a throwaway Postgres cluster in a temp folder, loads pgTAP,
`tests/local/supabase_stub.sql` (the Supabase roles, `auth.users`, `auth.uid()` and default
grants that the migration expects), applies every migration twice (to check it can be re-run),
runs the tests, and deletes the cluster. The exit code is non-zero if any test fails. Set
`PG_BIN` if the Postgres binaries aren't in `/usr/lib/postgresql/16/bin`, and `PGTEST_PORT` if
port 54329 is taken.

The stub is only for these local runs: never apply it to a real Supabase project.
