# Supabase (cloud sync backend)

Database schema and security rules for cloud sync. The design is in
[`docs/cloud-sync-plan.md`](../docs/cloud-sync-plan.md).

- `migrations/`: SQL migrations, applied in file-name order.
  `20261102000000_cloud_sync_schema.sql` creates `accounts`, `teams`, `team_members`,
  `players`, `games` and `ping`, the triggers (server-side `updated_at`, creator becomes
  director, a team always keeps a director), `add_team_coach()` and the Row Level Security
  policies.
- `tests/rls.test.sql`: pgTAP tests that act as anonymous, admin, director, coach, outsider
  and no-account users, and check what each can read and change.
- `tests/local/`: runs the migration and the tests on a plain local Postgres, without Supabase.
- `functions/admin/index.ts`: the `admin` Edge Function (Deno) used by the app's Admin page. It
  checks that the caller is the admin and, with the service role, creates an account
  (`create_account`: the auth user, if needed, and the `accounts` row) or removes one
  (`delete_account`: deletes the auth user; the account and memberships go with it). How to
  deploy it: step 9 of [`docs/supabase-setup.md`](../docs/supabase-setup.md).

## Who can do what

There are two levels of access:

1. **Accounts** (`accounts`): who may use the cloud at all. Only the admin manages them. Rows
   are created with the service role (the `admin` Edge Function, which also creates the auth
   user) or with SQL in the dashboard. `kind = 'director'` may create teams;
   `kind = 'coach'` only sees the teams they were added to. `is_admin` can only be set with
   SQL or the service role. An admin sees every account, team and team member list (but not
   players or games of teams they aren't in), can change any account's `kind`, delete
   accounts (not their own), and add, remove or change the role of any team member.
2. **Team membership** (`team_members`): who sees which team. `director` reads and writes the
   team, its players and games; `coach` only reads. Whoever creates a team becomes its
   director. A director adds coaches with `add_team_coach(team_id, email)`, which only adds
   people who already have an account and returns `added`, `already_member` or `no_account`.
   A director can remove coaches; only the admin can add, demote or remove directors. Anyone
   can leave a team. A team always keeps at least one director.

Users see their own account and the accounts of people who share a team with them (for the
emails in the member list).

## Applying to the Supabase project

Either paste the migration into the dashboard's SQL editor and run it, or, with the Supabase
CLI linked to the project, run `supabase db push`.

Then make yourself the admin. Create your user in the dashboard (Authentication → Add user),
then run this in the SQL editor:

```sql
insert into public.accounts (user_id, email, kind, is_admin)
select id, lower(email), 'director', true from auth.users where email = '<admin email>';
```

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
