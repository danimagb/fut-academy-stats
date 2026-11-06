# Clubs plan (club managers and team managers)

Adds **clubs** (e.g. "Padroense F.C.") above teams (the age groups: Sub-7A, Sub-7B, Sub-10C…)
and a new person in charge of a club, the **club manager**. Builds on the cloud sync design in
`docs/cloud-sync-plan.md` (read it first): local-first, invite-only, all access decided by RLS.

> **Every PR for this feature updates the "Progress" section below.**

**Names.** Code and database use the English role names; the app shows the Portuguese terms
the club uses:

| In code / database                             | UI (pt) / UI (en)         |
| ---------------------------------------------- | ------------------------- |
| club manager (`club_members.role = 'manager'`) | Coordenador / Coordinator |
| club member (`club_members.role = 'member'`)   | (no label)                |
| team manager (`team_members.role = 'manager'`) | Diretor / Director        |
| team coach (`team_members.role = 'coach'`)     | Treinador / Coach         |

Two levels per person: **in the club** they are a `manager` (all its teams) or a `member`
(can be picked as staff), and **in each team** they are a `manager` or a `coach`. Team managers
and team coaches are always club members; there is no club-wide "coach" role, because the
same person can be team manager of Sub-7A and team coach of Sub-8 (e.g. João: club `member`,
`manager` in Sub-7A, `coach` in Sub-8).

Identifiers follow it: `is_club_manager()`, `is_team_manager()`, `is_team_coach()`, `Role = 'club_manager' |
'team_manager' | 'team_coach'` in the app. Existing `director` names in code and i18n keys
and `coach` (`roleDirector`, `roleCoach`, `is_team_director`, …) are renamed in the step that touches them.

## Progress

| #   | Step                                                         | Status       | PR        |
| --- | ------------------------------------------------------------ | ------------ | --------- |
| 1   | Plan (this document)                                         | 🔄 in review | (this PR) |
| 2   | Database: clubs, club managers, new RLS, migration, tests    | ⏳ to do     |           |
| 3   | Admin: clubs, their people and club managers                 | ⏳ to do     |           |
| 4   | Sync + permissions in the app (club manager role)            | ⏳ to do     |           |
| 5   | Club manager screens: club teams, players, staff             | ⏳ to do     |           |
| 6   | Club logo (storage, upload, screens, PDFs)                   | ⏳ to do     |           |
| 7   | Team manager limits, README / privacy text, test on 2 phones | ⏳ to do     |           |

**Where things stand:** plan agreed with the maintainer (see "Decisions" at the end); step 2 next.

## What changes, in one table

| Who              | Given by     | Scope                      | Can do                                                                                                                                                |
| ---------------- | ------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**        | dashboard    | everything                 | Create clubs and set their name; invite club managers (new account + club); give and remove access (accounts).                                        |
| **Club manager** | admin        | all teams of their club(s) | Everything inside the club: create / rename / delete teams; players; games; assign team managers and team coaches; set the club's short name.         |
| **Team manager** | club manager | the teams they're assigned | Add, edit, remove players; create, start, run and finish games (events, clock, lineup); reports and stats. Not: rename/delete the team, manage staff. |
| **Team coach**   | club manager | the teams they're assigned | Read-only (as today): team, games, reports, stats, share PDFs.                                                                                        |

- Team managers and team coaches still need an **active account given by the admin**, and the admin
  gives it **in a club**: inviting someone = email + club (+ "club manager" or not). That makes
  them a member of the club. The club manager then picks staff for a team from the club's
  people (a list with a search filter), not by typing emails.
- The team manager and team coach keep what today's `director` and `coach` roles can do inside a team (full game access /
  read-only); what moves to the club manager is **managing** teams and people.
- Using the app without an account, and **local teams**, don't change.

## Data model

New tables:

| table          | columns                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clubs`        | `id` (text), `name` (set by the admin), `short_name` (e.g. "PFC", set by a club manager or the admin), `created_at`, `created_by`, `updated_at`, `deleted_at` |
| `club_members` | `club_id`, `user_id` (→ `accounts`, cascade), `role` (`manager` / `member`), `invited_by`, `created_at`; PK (club, user)                                      |

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
  may not), separate from the role in each team. With clubs only club managers (and the admin)
  create teams, inside their club, so the kind no longer means anything: an account just
  means "has access", being a club manager is a `club_members` row, and team manager / team coach
  is the role in each team. The Admin page asks for the email, the club and whether the
  person is a club manager of it.
- `team_members.role` becomes `'manager' | 'coach'` (existing `director` rows are renamed to `manager`). More than one club manager per club and
  one person in several clubs are allowed (the tables support it at no cost).

### RLS (the part that must be right)

New SECURITY DEFINER helpers (same style as today, empty `search_path`):

- `is_club_manager(club_id)`, `is_club_member(club_id)` (any role)
- `manages_team_club(team_id)`: the user manages the team's club.
- `can_read_team(team_id)` = `is_team_member` or `manages_team_club`.
- `can_play_team(team_id)` (games, players) = `is_team_manager` or `manages_team_club`.
- `can_manage_team(team_id)` (team row, staff) = `manages_team_club` or `is_admin`.

| table          | select                                                                                         | insert / update / delete                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `clubs`        | club managers of it, members of its teams, admin                                               | insert / `name` / delete: admin; `short_name`: its club managers or admin (column grant)                                     |
| `club_members` | members of the club (to show names in staff lists), admin                                      | admin only                                                                                                                   |
| `teams`        | `can_read_team`, admin                                                                         | insert: club manager of `club_id` (or admin); update/delete: `can_manage_team`; `club_id` can't change (except by the admin) |
| `team_members` | `can_read_team`, admin                                                                         | through RPCs only for club managers; admin direct; anyone can leave                                                          |
| `players`      | `can_read_team`                                                                                | `can_play_team` (team managers add, edit and remove players)                                                                 |
| `games`        | `can_read_team`                                                                                | `can_play_team` (finished-game lock and data checks unchanged)                                                               |
| `accounts`     | self, admin, people sharing a team, **club managers see the accounts of their club's members** | admin only (as today)                                                                                                        |

- RPCs replacing `add_team_coach` (dropped; only the admin's own phone used it):
  `set_team_member(_team_id, _user_id, _role)` → `added` / `updated` (club manager of the
  team's club, or admin); the person must be a **member of that club** (error otherwise), so a
  club manager can only staff teams with their club's people. `remove_team_member(_team_id,
_user_id)`. Accounts are only created by the admin.
- Removing someone from a club (admin) also removes them from that club's teams.
- **Last-manager rule**: dropped (a team may have no team manager; the club's club managers can
  always reach it).
- Creating a team: today the creator becomes its director (trigger). For a club manager that
  isn't needed (they reach the team through the club): the trigger skips it when the creator
  manages the team's club.
- Removing a club manager / a club: their teams stay; deleting a club = soft-delete its teams
  (admin only, with a confirmation that names how many teams and games go).
- Tests in `supabase/tests/rls.test.sql`, at least: club manager of club A can't read or write
  club B; club manager can create teams only in their club and can't move a team to another
  club; club manager can set `short_name` but not `name`; team manager can write players and games
  but not the team row or members; team coach is read-only; club manager can't grant `manager` of the club,
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
   team becomes a `member` of the club, except **admins, who become its `manager`**. Today
   that makes the maintainer's account (admin + director of the team) **admin and club manager
   of Padroense FC**, ready for testing. No email is written in the migration.

No transition period is needed: phones running the old app are updated by the service worker
on the next build, and the only old-app action that would now fail (creating a cloud team
without a club) is refused by the server and stays local, as for any refused upload.

## Admin Edge Function

- `create_account { email, club_id, role }` (no kind any more; `role` = `manager` /
  `member`): creates the account if needed (reuses an existing one), then the `club_members`
  row. Adding an existing account to another club, making someone club manager or removing them
  from a club is a plain table write (RLS: admin), so only the account creation needs the
  service role.
- No email is sent by the function (as today): the person activates the account with the code.

## App

### Sync (`src/data/sync.ts`)

- `Role` becomes `'club_manager' | 'team_manager' | 'team_coach'`. The membership pull asks one RPC,
  `my_teams()` → `(team_id, role)`: membership rows plus every team of clubs the user
  manages (`club_manager` wins over a membership in the same team).
- Push for `club_manager` and `team_manager` teams; the team row itself only for `club_manager`
  (a team manager's edit of the team name is not possible in the UI, and RLS refuses it anyway).
- A team created by a club manager gets `clubId`, is a cloud team straight away (as
  `uploadTeams` does today for director accounts). Uploading a local team = the club manager
  picks which of their clubs it goes into.
- New teams appearing in a club manager's club (another club manager created them) reach the
  phone on the next pull, as new memberships do today.
- `clubs` are pulled too (id, name), cached for offline display and for the club picker.

### Permissions (`src/data/access.ts`)

`readOnlyTeam` (team coach) stays. New: `canManageTeam(id)` (club manager: rename, delete, staff),
`canEditPlayers(id)` (club manager + team manager), `canCreateTeams()` (club manager of some club).
The central guard in the click/submit handlers learns the new action lists the same way
`READ_ONLY_OK` works today.

### Screens

- **Admin tab**: new **Clubs** section — create clubs (name, optional short name), change the
  name; per club: its people (invite by email as club manager or member, make / unmake
  club manager, remove from the club) and its teams. Accounts list shows each person's clubs.
- **Teams list**: grouped by club (cloud teams), then "On this phone" (local teams). A
  club manager sees "+ New team" under each of their clubs; the club name is fixed by the club.
- **Team screen**:
  - Club manager: everything as today's team manager, plus **Staff**: "+ Add" opens a sheet with
    the club's people (email; those already on the team marked), a **search box that filters
    as you type**, and a _Diretor_ / _Treinador_ choice (`manager` / `coach`); change role, remove. Online only, like
    People today. Nobody in the club yet → "Ask the admin to invite people to the club".
- **Club screen** (club manager): the club's teams, "+ New team", the short name, and the
  club's people with the teams and role each one has.
  - Team manager: players (add / edit / remove, open question 2) and games; Staff is read-only
    (list only); no rename / delete team.
  - Team coach: unchanged (read-only pill).
- **Profile → Account**: shows "Club manager · Padroense F.C." / team roles.
- i18n (`en` + `pt`): Club / Clube, Club manager / Coordenador, Team manager / Diretor, Staff / Equipa técnica, etc.
  Existing `roleDirector` = Diretor, `roleCoach` = Treinador already match.

## Club logo

The club manager (or the admin) can add the club's logo; the app shows it on every screen
where the club appears.

- **Storage**: Supabase Storage, bucket `club-logos`, one file per club at
  `{club_id}/logo.webp`. The bucket is **public for reading** (a crest isn't private, and a
  plain URL works in `<img>` and in the service worker cache) and limited to images
  (`image/png`, `image/jpeg`, `image/webp`) of at most 512 KB. Writes go through RLS on
  `storage.objects`: insert / update / delete only if `is_club_manager(<first folder of the
path>)` or `is_admin()`; anon and other users can't write.
- **Table**: `clubs.logo_version int` (null = no logo), bumped by an RPC
  `set_club_logo(_club_id, _present bool)` after the upload (same RLS rule). It moves
  `clubs.updated_at`, so phones learn about a new logo on the next pull. The URL is
  `…/storage/v1/object/public/club-logos/{club_id}/logo.webp?v={logo_version}`.
- **Upload in the app**: Club screen → "Logo" → pick a photo/file → the app crops it to a
  square and resizes it to 256 × 256 WebP in a canvas (a few tens of KB) before uploading,
  with a preview, "Change" and "Remove". Online only.
- **Offline**: after a pull, the app downloads the logo once per `logo_version` and keeps it
  as a data URL in its own localStorage key (`fut-academy-stats.logos`, by club id), not in
  `db` (so backups and change tracking don't carry images). No logo or not downloaded yet →
  the current look (text only).
- **Where it shows**: teams list (club header), Club and team screens, game screen
  scoreboard (small, next to the club's short name), games list, report preview, and the
  game report and player stats **PDFs** (header). The PDF writer (`share-pdf.ts`, written by
  hand) embeds a JPEG made from the cached logo through a canvas (`/DCTDecode` image
  XObject), so it needs no library.
- **Local teams** have no logo for now (possible later: a logo stored on the phone).
- Tests: storage policies in `rls.test.sql` (club manager of club A can write `A/…` only;
  team managers, team coaches and outsiders can't write; admin can); E2E with the fake
  Supabase serving an image.

## Steps (PRs)

2. **Database**: migration `2026xxxx_clubs.sql` (tables, helpers, policies, RPCs, triggers,
   drop `kind`, Padroense FC from the existing team), tests, `supabase/README.md`. Ships
   together with step 3 and 4 (the old app's team creation and Admin "kind" stop working).
3. **Admin**: Edge Function `create_account` with club and role, Admin tab Clubs section
   (clubs, their people, club managers). Fake Supabase in `src/test/fake-supabase.ts` + `e2e/cloud-stub.ts` learn clubs.
4. **Sync + permissions**: `my_teams()`, `Role` with `club_manager` / `team_manager`, `clubId` on `Team`
   (validate.ts, store normalize), clubs cache, access helpers. Unit tests in `sync.test.ts`.
5. **Club manager screens**: teams grouped by club, new team in a club, Staff with roles,
   upload-local-team-into-club. E2E: club manager / team manager / team coach phones.
6. **Club logo**: bucket + storage policies + `set_club_logo` (migration and tests), upload
   on the Club screen, offline cache, logo on the screens and in the PDFs.
7. **Finishing**: team manager limits in the UI, README + "How your data is handled" text,
   test on two real phones against the real project.

## Decisions (agreed with the maintainer, 2026-11-06)

1. Account kinds (director / coach account) go away: it's a normal account, and the
   club manager sets each person's role in each team. Cloud teams can't be created outside a club.
2. Team managers can add, edit and remove players.
3. Club managers can do everything inside their club.
4. The admin creates the club and sets its name; club managers can set a **short name**
   (e.g. "PFC") instead of renaming it.
5. The model allows several clubs per person and different roles in different clubs; the
   UI doesn't need to handle it well yet (group by club and that's it).
6. Access is by admin invite only, into a club. Club managers assign the club's people to
   teams, picking them from a list with a search filter.
7. The existing team goes into a club **Padroense FC** created by the migration.
8. The maintainer's account becomes admin + club manager of Padroense FC (by the migration).
9. Club managers can add a club logo (Supabase Storage), shown on the screens and in the PDFs.
