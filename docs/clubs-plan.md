# Clubs and coordinators plan

Adds **clubs** (e.g. "Padroense F.C.") above teams (the age groups: Sub-7A, Sub-7B, Sub-10C…)
and a new person in charge of a club, the **coordinator**. Builds on the cloud sync design in
`docs/cloud-sync-plan.md` (read it first): local-first, invite-only, all access decided by RLS.

> **Every PR for this feature updates the "Progress" section below.**

## Progress

| #   | Step                                                      | Status     | PR  |
| --- | --------------------------------------------------------- | ---------- | --- |
| 1   | Plan (this document)                                      | 📝 draft   |     |
| 2   | Database: clubs, coordinators, new RLS, migration, tests  | ⏳ to do   |     |
| 3   | Admin: clubs, invite coordinators, assign teams to clubs  | ⏳ to do   |     |
| 4   | Sync + permissions in the app (coordinator role)          | ⏳ to do   |     |
| 5   | Coordinator screens: club teams, players, staff           | ⏳ to do   |     |
| 6   | Director limits, README / privacy text, test on 2 phones  | ⏳ to do   |     |

**Where things stand:** plan only; open questions at the end.

## What changes, in one table

| Who             | Given by    | Scope                       | Can do                                                                                                                                  |
| --------------- | ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**       | dashboard   | everything                  | Create / rename clubs; invite coordinators (new account + club); give and remove access (accounts); assign existing teams to a club.   |
| **Coordinator** | admin       | all teams of their club(s)  | Create / rename / delete teams of the club; add, edit, remove players; assign directors and coaches to teams; everything a director can. |
| **Director**    | coordinator | the teams they're assigned  | Edit players; create, start, run and finish games (events, clock, lineup); reports and stats. Not: rename/delete the team, manage staff. |
| **Coach**       | coordinator | the teams they're assigned  | Read-only (as today): team, games, reports, stats, share PDFs.                                                                          |

- Directors and coaches still need an **active account given by the admin**. A coordinator
  assigning an email without an account gets "this person doesn't have access yet, ask the
  admin" (as `add_team_coach` does today).
- The roles `director` and `coach` inside a team stay what they are today (full game access /
  read-only); what moves to the coordinator is **managing** teams and people.
- Using the app without an account, and **local teams**, don't change.

## Data model

New tables:

| table               | columns                                                              |
| ------------------- | -------------------------------------------------------------------- |
| `clubs`             | `id` (text), `name`, `created_at`, `created_by`, `updated_at`, `deleted_at` |
| `club_coordinators` | `club_id`, `user_id` (→ `accounts`, cascade), `invited_by`, `created_at`; PK (club, user) |

Changes:

- `teams.club_id text references clubs` (nullable during the transition: existing cloud teams
  have none until the admin assigns them). `teams.club` (text) **stays** and is set by a
  trigger from `clubs.name` when `club_id` is set, so the app, the PDF and offline display
  keep working with no change to the `Team` shape (`clubId?` is added as an optional field).
  Renaming a club updates `club` on its teams (and their `updated_at`, so phones pull it).
- `accounts.kind`: today `director` (may create cloud teams) / `coach`. With clubs, only
  coordinators (and the admin) create cloud teams, so the kind no longer gates anything.
  Proposal: allow `kind` = `coordinator` | `member`, migrate `director`/`coach` → `member`
  (and accounts that are coordinators → `coordinator`), keep it as a label on the Admin page.
  Being a coordinator is the `club_coordinators` row, not the kind. _(Open question 1.)_
- `team_members` keeps `role in ('director','coach')`. More than one coordinator per club and
  one person in several clubs are allowed (the tables support it at no cost).

### RLS (the part that must be right)

New SECURITY DEFINER helpers (same style as today, empty `search_path`):

- `is_club_coordinator(club_id)`
- `coordinates_team(team_id)`: the user coordinates the team's club.
- `can_read_team(team_id)` = `is_team_member` or `coordinates_team`.
- `can_play_team(team_id)` (games, players) = `is_team_director` or `coordinates_team`.
- `can_manage_team(team_id)` (team row, staff) = `coordinates_team` or `is_admin`.

| table               | select                                    | insert / update / delete                                                                 |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `clubs`             | coordinators of it, members of its teams, admin | admin only (coordinators may rename? open question 4)                              |
| `club_coordinators` | coordinators of the club, admin           | admin only                                                                               |
| `teams`             | `can_read_team`, admin                    | insert: coordinator of `club_id` (or admin); update/delete: `can_manage_team`; `club_id` changes only by admin |
| `team_members`      | `can_read_team`, admin                    | through RPCs only for coordinators; admin direct; anyone can leave                       |
| `players`           | `can_read_team`                           | `can_play_team` (directors edit players, open question 2)                                |
| `games`             | `can_read_team`                           | `can_play_team` (finished-game lock and data checks unchanged)                           |
| `accounts`          | self, admin, people sharing a team, **coordinators see accounts in their clubs' teams** | admin only (as today)                       |

- RPCs replacing `add_team_coach`:
  `set_team_member(_team_id, _email, _role)` → `added` / `updated` / `already_member` /
  `no_account` (coordinator of the team's club, or admin);
  `remove_team_member(_team_id, _user_id)`. Keep `add_team_coach` working (as an alias for
  `role = 'coach'`) until every installed app has updated, then drop it.
- **Last-director rule**: drop it for teams that have a club (the coordinator is always there
  to fix things); keep it for teams without a club during the transition.
- Creating a team: today the creator becomes its director (trigger). For a coordinator that
  isn't needed (they reach the team through the club): the trigger skips it when the creator
  coordinates the team's club.
- Removing a coordinator / a club: their teams stay; deleting a club = soft-delete its teams
  (admin only, with a confirmation that names how many teams and games go).
- Tests in `supabase/tests/rls.test.sql`, at least: coordinator of club A can't read or write
  club B; coordinator can create teams only in their club and can't move a team to another
  club; director can write players and games but not the team row or members; coach is
  read-only; coordinator can't grant `coordinator`, can't touch `accounts`, can't add an email
  without an account; admin can do all of it; anon gets nothing; old `add_team_coach` still
  behaves.

### Migration of existing data

1. Migration creates the tables with no clubs; existing cloud teams have `club_id = null` and
   keep working exactly as today (members and roles unchanged).
2. Admin page lists "Teams without a club" and groups the rest by club name (`teams.club`
   text) to suggest: "create club *Padroense F.C.* and put these 4 teams in it?".
3. Once every team has a club, a later migration can make `club_id` not null and remove the
   transition code (last-director rule, `add_team_coach`, "director account can create teams").

## Admin Edge Function

- `create_account { email, kind }` stays; new `invite_coordinator { email, club_id }`: creates
  the account if needed (reuses an existing one), then the `club_coordinators` row. Adding an
  existing account as coordinator, or removing one, is a plain table write (RLS: admin), so
  only the account creation needs the service role.
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

- **Admin tab**: new **Clubs** section — create / rename clubs; per club: coordinators (invite
  by email, add an existing account, remove) and its teams; "Teams without a club" with an
  "assign to club" picker. Accounts list shows each person's clubs/teams.
- **Teams list**: grouped by club (cloud teams), then "On this phone" (local teams). A
  coordinator sees "+ New team" under each of their clubs; the club name is fixed by the club.
- **Team screen**:
  - Coordinator: everything as today's director, plus **Staff**: add by email with role
    _Director_ or _Coach_, change role, remove.
  - Director: players (add / edit / remove, open question 2) and games; Staff is read-only
    (list only); no rename / delete team.
  - Coach: unchanged (read-only pill).
- **Profile → Account**: shows "Coordinator · Padroense F.C." / team roles.
- i18n (`en` + `pt`): Club / Clube, Coordinator / Coordenador, Staff / Equipa técnica, etc.
  Existing `roleDirector` = Diretor, `roleCoach` = Treinador already match.

## Steps (PRs)

2. **Database**: migration `2026xxxx_clubs.sql` (tables, helpers, policies, RPCs, triggers,
   `kind` change), tests, `supabase/README.md`. Nothing visible changes in the app (old
   behaviour keeps working: teams without a club).
3. **Admin**: Edge Function `invite_coordinator`, Admin tab Clubs section, assign teams to
   clubs. Fake Supabase in `src/test/fake-supabase.ts` + `e2e/cloud-stub.ts` learn clubs.
4. **Sync + permissions**: `my_teams()`, `Role` with `coordinator`, `clubId` on `Team`
   (validate.ts, store normalize), clubs cache, access helpers. Unit tests in `sync.test.ts`.
5. **Coordinator screens**: teams grouped by club, new team in a club, Staff with roles,
   upload-local-team-into-club. E2E: coordinator / director / coach phones.
6. **Finishing**: director limits in the UI, README + "How your data is handled" text,
   test on two real phones against the real project; later migration making `club_id`
   required once every team has a club.

## Open questions (decide before step 2)

1. **Account kinds**: OK to drop director/coach _account_ kinds (the per-team role is what
   matters) and stop letting "director accounts" create cloud teams outside a club?
2. **Directors and players**: can a director **add and remove** players, or only edit
   existing ones (number / names)? The plan assumes add/edit/remove.
3. **Coordinator in games**: does the coordinator have director rights in every team of the
   club (assumed), or only read access unless assigned to the team?
4. **Club name**: may coordinators rename their club, or only the admin?
5. **Several clubs**: can one person coordinate more than one club, or be director in club A
   and coach in club B? (The model allows it; the UI just needs to group by club.)
6. **Coordinator invites**: should a coordinator be able to give access to new people
   (create directors/coaches accounts) or does that stay admin-only as you described? The plan
   keeps it admin-only.
7. **Existing teams**: create the clubs from today's `teams.club` text automatically in the
   migration, or let the admin do it on the Admin page?
