# Clubs and coordinators plan

Adds **clubs** (e.g. "Padroense F.C.") above teams (the age groups: Sub-7A, Sub-7B, Sub-10C…)
and a new person in charge of a club, the **coordinator**. Builds on the cloud sync design in
`docs/cloud-sync-plan.md` (read it first): local-first, invite-only, all access decided by RLS.

> **Every PR for this feature updates the "Progress" section below.**

## Progress

| #   | Step                                                     | Status       | PR        |
| --- | -------------------------------------------------------- | ------------ | --------- |
| 1   | Plan (this document)                                     | 🔄 in review | (this PR) |
| 2   | Database: clubs, coordinators, new RLS, migration, tests | ⏳ to do     |           |
| 3   | Admin: clubs, their people and coordinators              | ⏳ to do     |           |
| 4   | Sync + permissions in the app (coordinator role)         | ⏳ to do     |           |
| 5   | Coordinator screens: club teams, players, staff          | ⏳ to do     |           |
| 6   | Director limits, README / privacy text, test on 2 phones | ⏳ to do     |           |

**Where things stand:** plan agreed with the maintainer (see "Decisions" at the end); step 2 next.

## What changes, in one table

| Who             | Given by    | Scope                      | Can do                                                                                                                                                |
| --------------- | ----------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**       | dashboard   | everything                 | Create clubs and set their name; invite coordinators (new account + club); give and remove access (accounts).                                         |
| **Coordinator** | admin       | all teams of their club(s) | Everything inside the club: create / rename / delete teams; players; games; assign directors and coaches; set the club's short name.                  |
| **Director**    | coordinator | the teams they're assigned | Add, edit, remove players; create, start, run and finish games (events, clock, lineup); reports and stats. Not: rename/delete the team, manage staff. |
| **Coach**       | coordinator | the teams they're assigned | Read-only (as today): team, games, reports, stats, share PDFs.                                                                                        |

- Directors and coaches still need an **active account given by the admin**, and the admin
  gives it **in a club**: inviting someone = email + club (+ "coordinator" or not). That makes
  them a member of the club. The coordinator then picks staff for a team from the club's
  people (a list with a search filter), not by typing emails.
- The roles `director` and `coach` inside a team stay what they are today (full game access /
  read-only); what moves to the coordinator is **managing** teams and people.
- Using the app without an account, and **local teams**, don't change.

## Data model

New tables:

| table          | columns                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clubs`        | `id` (text), `name` (set by the admin), `short_name` (e.g. "PFC", set by a coordinator or the admin), `created_at`, `created_by`, `updated_at`, `deleted_at` |
| `club_members` | `club_id`, `user_id` (→ `accounts`, cascade), `role` (`coordinator` / `member`), `invited_by`, `created_at`; PK (club, user)                                 |

Changes:

- `teams.club_id text not null references clubs`: **every cloud team belongs to a club**.
  `teams.club` (text) **stays** and is set by a trigger from `clubs.name`, so the app, the PDF
  and offline display keep working with no change to the `Team` shape (`clubId?` is added as
  an optional field; local teams keep their free-text club). A change of the club's name or
  short name touches its teams' `updated_at`, so phones pull it.
- `short_name` is shown where space is tight (game screen, games list, team chips: "PFC ·
  Sub-7B"); the full name stays on the report/PDF. Empty = use the full name.
- `accounts.kind` is **removed**. Today, when the admin gives access, they also pick an
  account kind (director account = may create cloud teams outside any club; coach account =
  may not), separate from the role in each team. With clubs only coordinators (and the admin)
  create teams, inside their club, so the kind no longer means anything: an account just
  means "has access", being a coordinator is a `club_members` row, and director / coach
  is the role in each team. The Admin page asks for the email, the club and whether the
  person is a coordinator of it.
- `team_members` keeps `role in ('director','coach')`. More than one coordinator per club and
  one person in several clubs are allowed (the tables support it at no cost).

### RLS (the part that must be right)

New SECURITY DEFINER helpers (same style as today, empty `search_path`):

- `is_club_coordinator(club_id)`, `is_club_member(club_id)` (any role)
- `coordinates_team(team_id)`: the user coordinates the team's club.
- `can_read_team(team_id)` = `is_team_member` or `coordinates_team`.
- `can_play_team(team_id)` (games, players) = `is_team_director` or `coordinates_team`.
- `can_manage_team(team_id)` (team row, staff) = `coordinates_team` or `is_admin`.

| table          | select                                                                                        | insert / update / delete                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `clubs`        | coordinators of it, members of its teams, admin                                               | insert / `name` / delete: admin; `short_name`: its coordinators or admin (column grant)                                     |
| `club_members` | members of the club (to show names in staff lists), admin                                     | admin only                                                                                                                  |
| `teams`        | `can_read_team`, admin                                                                        | insert: coordinator of `club_id` (or admin); update/delete: `can_manage_team`; `club_id` can't change (except by the admin) |
| `team_members` | `can_read_team`, admin                                                                        | through RPCs only for coordinators; admin direct; anyone can leave                                                          |
| `players`      | `can_read_team`                                                                               | `can_play_team` (directors add, edit and remove players)                                                                    |
| `games`        | `can_read_team`                                                                               | `can_play_team` (finished-game lock and data checks unchanged)                                                              |
| `accounts`     | self, admin, people sharing a team, **coordinators see the accounts of their club's members** | admin only (as today)                                                                                                       |

- RPCs replacing `add_team_coach` (dropped; only the admin's own phone used it):
  `set_team_member(_team_id, _user_id, _role)` → `added` / `updated` (coordinator of the
  team's club, or admin); the person must be a **member of that club** (error otherwise), so a
  coordinator can only staff teams with their club's people. `remove_team_member(_team_id,
_user_id)`. Accounts are only created by the admin.
- Removing someone from a club (admin) also removes them from that club's teams.
- **Last-director rule**: dropped (a team may have no director; the club's coordinators can
  always reach it).
- Creating a team: today the creator becomes its director (trigger). For a coordinator that
  isn't needed (they reach the team through the club): the trigger skips it when the creator
  coordinates the team's club.
- Removing a coordinator / a club: their teams stay; deleting a club = soft-delete its teams
  (admin only, with a confirmation that names how many teams and games go).
- Tests in `supabase/tests/rls.test.sql`, at least: coordinator of club A can't read or write
  club B; coordinator can create teams only in their club and can't move a team to another
  club; coordinator can set `short_name` but not `name`; director can write players and games
  but not the team row or members; coach is read-only; coordinator can't grant `coordinator`,
  can't touch `accounts`, can't add someone who isn't a member of the club, sees only their
  own club's people; a team without a club is
  refused; admin can do all of it; anon gets nothing.

### Migration of existing data

Today there is one cloud team (the maintainer's, club "Padroense FC"). The migration, in one go:

1. Creates one club per distinct `teams.club` text (trimmed, case-insensitive), with that
   name as given, and sets `club_id` on those teams: today that is just **Padroense FC**.
2. Makes `teams.club_id` not null, drops `accounts.kind`, the last-director trigger and
   `add_team_coach`.
3. Existing team memberships stay as they are, and everyone who is a member of a Padroense FC
   team becomes a `member` of the club, except **admins, who become its `coordinator`**. Today
   that makes the maintainer's account (admin + director of the team) **admin and coordinator
   of Padroense FC**, ready for testing. No email is written in the migration.

No transition period is needed: phones running the old app are updated by the service worker
on the next build, and the only old-app action that would now fail (creating a cloud team
without a club) is refused by the server and stays local, as for any refused upload.

## Admin Edge Function

- `create_account { email, club_id, role }` (no kind any more; `role` = `coordinator` /
  `member`): creates the account if needed (reuses an existing one), then the `club_members`
  row. Adding an existing account to another club, making someone coordinator or removing them
  from a club is a plain table write (RLS: admin), so only the account creation needs the
  service role.
- No email is sent by the function (as today): the person activates the account with the code.

## App

### Sync (`src/data/sync.ts`)

- `Role` becomes `'coordinator' | 'director' | 'coach'`. The membership pull asks one RPC,
  `my_teams()` → `(team_id, role)`: membership rows plus every team of clubs the user
  coordinates (`coordinator` wins over a membership in the same team).
- Push for `coordinator` and `director` teams; the team row itself only for `coordinator`
  (a director's edit of the team name is not possible in the UI, and RLS refuses it anyway).
- A team created by a coordinator gets `clubId`, is a cloud team straight away (as
  `uploadTeams` does today for director accounts). Uploading a local team = the coordinator
  picks which of their clubs it goes into.
- New teams appearing in a coordinator's club (another coordinator created them) reach the
  phone on the next pull, as new memberships do today.
- `clubs` are pulled too (id, name), cached for offline display and for the club picker.

### Permissions (`src/data/access.ts`)

`readOnlyTeam` (coach) stays. New: `canManageTeam(id)` (coordinator: rename, delete, staff),
`canEditPlayers(id)` (coordinator + director), `canCreateTeams()` (coordinator of some club).
The central guard in the click/submit handlers learns the new action lists the same way
`READ_ONLY_OK` works today.

### Screens

- **Admin tab**: new **Clubs** section — create clubs (name, optional short name), change the
  name; per club: its people (invite by email as coordinator or member, make / unmake
  coordinator, remove from the club) and its teams. Accounts list shows each person's clubs.
- **Teams list**: grouped by club (cloud teams), then "On this phone" (local teams). A
  coordinator sees "+ New team" under each of their clubs; the club name is fixed by the club.
- **Team screen**:
  - Coordinator: everything as today's director, plus **Staff**: "+ Add" opens a sheet with
    the club's people (email; those already on the team marked), a **search box that filters
    as you type**, and a _Director_ / _Coach_ choice; change role, remove. Online only, like
    People today. Nobody in the club yet → "Ask the admin to invite people to the club".
- **Club screen** (coordinator): the club's teams, "+ New team", the short name, and the
  club's people with the teams and role each one has.
  - Director: players (add / edit / remove, open question 2) and games; Staff is read-only
    (list only); no rename / delete team.
  - Coach: unchanged (read-only pill).
- **Profile → Account**: shows "Coordinator · Padroense F.C." / team roles.
- i18n (`en` + `pt`): Club / Clube, Coordinator / Coordenador, Staff / Equipa técnica, etc.
  Existing `roleDirector` = Diretor, `roleCoach` = Treinador already match.

## Steps (PRs)

2. **Database**: migration `2026xxxx_clubs.sql` (tables, helpers, policies, RPCs, triggers,
   drop `kind`, Padroense FC from the existing team), tests, `supabase/README.md`. Ships
   together with step 3 and 4 (the old app's team creation and Admin "kind" stop working).
3. **Admin**: Edge Function `create_account` with club and role, Admin tab Clubs section
   (clubs, their people, coordinators). Fake Supabase in `src/test/fake-supabase.ts` + `e2e/cloud-stub.ts` learn clubs.
4. **Sync + permissions**: `my_teams()`, `Role` with `coordinator`, `clubId` on `Team`
   (validate.ts, store normalize), clubs cache, access helpers. Unit tests in `sync.test.ts`.
5. **Coordinator screens**: teams grouped by club, new team in a club, Staff with roles,
   upload-local-team-into-club. E2E: coordinator / director / coach phones.
6. **Finishing**: director limits in the UI, README + "How your data is handled" text,
   test on two real phones against the real project.

## Decisions (agreed with the maintainer, 2026-11-06)

1. Account kinds (director / coach account) go away: it's a normal account, and the
   coordinator sets each person's role in each team. Cloud teams can't be created outside a club.
2. Directors can add, edit and remove players.
3. Coordinators can do everything inside their club.
4. The admin creates the club and sets its name; coordinators can set a **short name**
   (e.g. "PFC") instead of renaming it.
5. The model allows several clubs per person and different roles in different clubs; the
   UI doesn't need to handle it well yet (group by club and that's it).
6. Access is by admin invite only, into a club. Coordinators assign the club's people to
   teams, picking them from a list with a search filter.
7. The existing team goes into a club **Padroense FC** created by the migration.
8. The maintainer's account becomes admin + coordinator of Padroense FC (by the migration).
