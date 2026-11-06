# Supabase (cloud sync backend)

Database schema and security rules for cloud sync. The design is in
[`docs/cloud-sync-plan.md`](../docs/cloud-sync-plan.md).

- `migrations/`: SQL migrations, applied in file-name order.
  `20261102000000_cloud_sync_schema.sql` creates `accounts`, `teams`, `team_members`,
  `players`, `games` and `ping`, the triggers (server-side `updated_at`) and the Row Level
  Security policies. `20261105000000_lock_finished_games.sql` stops new events in finished
  games; `20261106000000_data_checks.sql` adds `CHECK` constraints.
  `20261107000000_clubs.sql` adds clubs (`clubs`, `club_members`, `teams.club_id`), the
  `manager` / `coach` team roles and `my_teams()`, and rewrites the policies for them
  (design: [`docs/clubs-plan.md`](../docs/clubs-plan.md)).
  `20261108000000_club_logos.sql` adds club logos (Storage bucket `club-logos`).
  `20261109000000_live_game_owner.sql`: a live game is only changed by the phone that
  kicked it off (`data.owner`), or by one taking it over on purpose (`owner.from`).
- `tests/rls.test.sql`: pgTAP tests that act as anonymous, admin, club manager, team manager,
  team coach, club staff, another club's manager and no-account users, and check what each
  can read and change. `tests/clubs_migration.test.sql` checks what the clubs migration made
  of the data before it (seeded by `tests/local/before_20261107000000_clubs.sql`).
- `tests/local/`: runs the migration and the tests on a plain local Postgres, without Supabase.
- `config.toml`: Supabase CLI and Branching configuration (local stack, preview branches, the
  functions to deploy).
- `functions/admin/index.ts`: the `admin` Edge Function (Deno) used by the app's Admin page. It
  checks that the caller is the admin and, with the service role, creates an account
  (`create_account`: the auth user, if needed, and the `accounts` row) or removes one
  (`delete_account`: deletes the auth user; the account and memberships go with it). How to
  deploy it: step 9 of [`docs/supabase-setup.md`](../docs/supabase-setup.md).

## Who can do what

Three levels:

1. **Accounts** (`accounts`): who may use the cloud at all. Only the admin manages them. Rows
   are created with the service role (the `admin` Edge Function, which also creates the auth
   user) or with SQL in the dashboard. `is_admin` can only be set with SQL or the service
   role. Nothing in `accounts` can be changed through the API; the admin can delete accounts
   (not their own).
2. **Clubs** (`clubs`, `club_members`): the admin creates clubs, names them and decides who is
   in each one, as `manager` (UI: Coordenador) or `staff`. A club's managers can set its
   `short_name`. A club can only be deleted once it has no teams. Leaving a club removes the
   person's roles in its teams.
3. **Teams** (`teams`, `team_members`): every team is in a club (`teams.club` is copied from
   the club's name). The club's managers create, change and delete its teams, and give the
   club's people a role in them: `manager` (UI: Diretor) writes the team's players and games;
   `coach` (UI: Treinador) only reads. Club managers can do everything a team manager can, in
   every team of the club. Only people of the team's club can have a role in it. Anyone can
   leave a team; a team may have no team manager.

The admin sees every club, club member, team, team role and account, and manages all of them,
but sees no players or games of clubs they are not in. Users see their own account, the
accounts of their teammates, and (club managers) the accounts of their club's people.

`my_teams()` returns the teams the signed-in user can see, with the role the app works with:
`club_manager`, `team_manager` or `team_coach`.

## Applying to the Supabase project

Through the Supabase GitHub integration: merging into `main` applies new migrations and deploys
the Edge Functions declared in `config.toml` (setup and the one-off "which migrations already
ran" step: [`docs/supabase-setup.md`](../docs/supabase-setup.md), step 10). By hand (without the
integration): paste the migration into the dashboard's SQL editor, or run `supabase db push`
with the CLI linked to the project.

`config.toml` is the CLI / Branching configuration: preview branches take its `[auth]` and
other settings; production only takes the functions (there is no `[remotes]` block for it).

Then make yourself the admin. Create your user in the dashboard (Authentication → Add user),
then run this in the SQL editor:

```sql
insert into public.accounts (user_id, email, is_admin)
select id, lower(email), true from auth.users where email = '<admin email>';
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
