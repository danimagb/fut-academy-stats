# Cloud sync plan (Supabase, invite-only)

Work happens on the `feature/cloud-sync` branch, in small PRs into that branch. The feature
branch is merged into `main` only once everything works end to end.

> **Every PR for this feature updates the "Progress" section below** (status, what was done,
> anything the next step needs to know). It's how the next PR, or the next Claude session,
> knows where things stand.

## Progress

| # | Step | Status | PR |
|---|------|--------|----|
| 1 | Plan | ✅ merged | danimagb/fut-academy-stats#10 |
| – | Persistent storage (shipped on `main`, outside the feature branch) | ✅ merged | danimagb/fut-academy-stats#11 |
| 2 | Local data groundwork | ✅ merged | danimagb/fut-academy-stats#12 |
| 3 | Database (tables, RLS, tests) + Supabase setup guide | ✅ merged | danimagb/fut-academy-stats#13 |
| 4 | Sign-in (email code) | ✅ merged | danimagb/fut-academy-stats#14 |
| 5 | Sync engine | ✅ merged | danimagb/fut-academy-stats#15 |
| 6 | Directors, coaches and invites; read-only coach view | ✅ merged | danimagb/fut-academy-stats#16 |
| 7 | Finishing (keep-alive, privacy, README), test on two phones, merge into `main` | 🔄 in review | (this PR) |

**Where things stand (update this with every PR):**

- Done in step 2: `save()` tracks changes. Every team/player/game in `db` has `updatedAt` (ms,
  `0` for records from before tracking) and `dirty` (`true` = not uploaded yet). Removed
  records leave `{ kind, id, deletedAt }` in `db.deleted`. New ids are `crypto.randomUUID()`.
  The sync engine (step 5) should push records with `dirty: true` plus `db.deleted`, then
  clear `dirty` and drop sent tombstones. It must write those changes **without** going
  through `trackChanges()`, or the cleared flags will look like edits: write the store
  directly and refresh the `saved` snapshot with `snapshotOf(db)`.
- Done in step 3:
  - `supabase/migrations/20261102000000_cloud_sync_schema.sql`: tables `accounts`, `teams`,
    `team_members`, `players`, `games`, `ping`; triggers; RLS; `add_team_coach()`. See
    `supabase/README.md`.
  - RLS tests in `supabase/tests/rls.test.sql` (pgTAP, 173 checks), run locally with
    `bash supabase/tests/local/run.sh` (uses the container's Postgres 16 + pgTAP and a stub
    of Supabase's roles and `auth` schema). Run it after any schema change.
  - `docs/supabase-setup.md`: what the maintainer does in the dashboard.
- Things the next steps need to know about the database:
  - Column names are snake_case (`full_name`, `updated_at`, `deleted_at`, `team_id`); the
    app uses camelCase (`fullName`, `teamId`). The sync engine maps between them.
  - `updated_at`, `created_by` and `games.updated_by` are set by the server; values sent by
    the client are ignored. Ids can't be changed (error 23514).
  - Deleting = update `deleted_at` (soft delete), so other phones see it.
  - Upserts that RLS refuses fail with error 42501 (not 0 rows); plain updates/deletes that
    RLS refuses affect 0 rows silently.
  - When pulling `updated_at > last_sync`, keep a few seconds of overlap (a long transaction
    can commit a row with an older `updated_at`).
  - A team's creator becomes its director automatically (trigger). Members are added by
    directors (coaches only, via `add_team_coach`) and by the admin (directly). The last director of a team
    can't be removed, demoted or leave.
  - Accounts model (admin / director / coach accounts, directors adding coaches by email)
    added in this PR too: see "Authentication, accounts and team access".
  - `team_members.user_id` references `accounts`, so only people with an account can be
    members; deleting an account removes their memberships (a team can then be left without
    a director, for the admin to fix).
  - Directors add coaches only via `rpc('add_team_coach', { _team_id, _email })`, which
    returns `added` / `already_member` / `no_account` (error 42501 if not allowed). Adding
    members directly and changing roles are admin-only.
  - `teams_insert` also accepts an upsert from an existing director of that team, so a coach
    account made director of a team by the admin can still sync it.
  - The admin sees all teams and members but can't edit teams, players or games they don't
    direct.
- Done in step 4 (sign-in):
  - `config.js` holds the project URL and publishable key (public by design). The Supabase
    library is vendored as `vendor/supabase-js-2.118.0.js` (UMD, global `supabase`, MIT
    licence next to it) and cached by the service worker.
  - In `app.js` ("Cloud account" section): client `sb` (session kept in localStorage under
    `fut-academy-stats.auth`, auto refresh), state `cloud` (`session`, `account`, sign-in
    step). `refreshAccount()` loads the user's `accounts` row and caches it under
    `fut-academy-stats.account` for offline display. `sb` is `null` if the library or config
    is missing; the app then works as before.
  - Profile → Account: email → `signInWithOtp({ shouldCreateUser: false })` → code →
    `verifyOtp({ type: 'email' })`; shows email + account kind; sign out (`scope: 'local'`,
    works offline). Error messages for no access, wrong/expired code, rate limit, offline.
  - Tested in a browser with simulated Supabase responses (UI flow), and against the **real
    project** with curl: anon reads only `ping` (writes, RPCs and sign-up refused); the
    maintainer signed in with an emailed code (the project sends **8-digit** codes; the app
    accepts 6–10); their `accounts` row reads director + admin; creating a team made them
    director; `is_admin` can't be changed through the API. The test team was deleted.
  - The cloud environment needs `*.supabase.co` (or the project host) allowed under Network
    access to reach the project.
- Done in step 5 (sync engine, "Cloud sync" section of `app.js`):
  - `db.sync = { userId, lastPulledAt, lastSyncAt, teams: { [teamId]: 'director'|'coach' },
    uploads: [teamId] }` (defaulted by `normalize()`). A team is a cloud team iff its id is in
    `db.sync.teams`; its players and games are too. Everything else is local and never sent.
    `uploads` = teams being uploaded that the server hasn't confirmed yet (kept through pulls,
    reverted to local if the server refuses them).
  - `saveQuiet()` writes the store and refreshes the `saved` snapshot without marking
    anything dirty: used for pulled data, clearing `dirty`, removing cloud data.
  - Tombstones in `db.deleted` now carry `teamId` (from the previous snapshot). A game moved
    from a cloud team to a local team leaves a `moved: true` tombstone (deleted in the cloud,
    kept on the phone); moved back, it's uploaded again (upserts send `deleted_at: null`).
  - Mapping: players' `number` is text on both sides; a game is its whole object (minus
    `updatedAt`/`dirty`) in `data`, plus `team_id`, `date` (valid `YYYY-MM-DD` or null) and
    `status`. Pulled records get `updatedAt = Date.parse(updated_at)`, `dirty: false`.
  - `syncNow()` (single flight, runs once more if called meanwhile) = push, then pull.
    **Push** only for teams where the role is director: upsert dirty records per kind
    (teams → players → games) and per team, in batches of 100; `dirty` is cleared only if the
    record didn't change during the request. Then deletes: `update({ deleted_at })` with
    `in('id', …)`. Deletes of local or coach teams are dropped. Offline (status 0) stops and
    keeps everything. Error 42501 for a team: an upload in progress reverts the team to local
    (status line says so); otherwise the user is probably no longer director: its changes are
    dropped and the team is downloaded in full. **Pull**: memberships (`team_members` of the
    user) → teams no longer in it are removed from the phone without tombstones; then teams,
    players, games with `updated_at > lastPulledAt − 10 s`, ordered, 1000 per page. Teams
    downloaded in full (no `updated_at` filter): new memberships, role changes, refused teams,
    and coach teams with local edits; local records of those teams the cloud doesn't have are
    removed (except a director's unsent changes). Merge: `deleted_at` → remove locally; local
    dirty record of a director team → kept (pushed next time); otherwise the cloud version
    replaces it (compared key-order-independently, as jsonb reorders keys). Everything is
    fetched first and applied in one go; `render()` only if something changed, and not while
    typing / a sheet, dialog or menu is open / dragging (then retried every 1.5 s).
  - Triggers: app start with a session, `SIGNED_IN` (after `refreshAccount()`), app visible
    again, `online`, 3 s after a `save()` that changed cloud records, every 60 s while visible,
    and "Sync now" on Profile. Nothing happens without a session and an `accounts` row.
  - A different user than `db.sync.userId` signs in → that user's cloud teams are removed from
    the phone first. Sign out (Profile) warns about changes not uploaded yet, then removes
    cloud teams (and their players and games) and resets `db.sync`; local teams stay. A
    `SIGNED_OUT` from elsewhere (session ended) does the same only if nothing is waiting;
    otherwise the data waits for the same user to sign in again.
  - Upload: first sign-in of a director (or admin) account on a phone with local teams opens
    a sheet to pick which to upload; local team screens show "☁️ Upload to the cloud" for
    director accounts. Teams list and team screen show "Synced" / "On this phone" (the latter
    only when signed in). Profile → Account shows a quiet status line + "Sync now".
  - Restoring a backup replaces only the local teams; cloud teams, `db.sync` and pending
    deletes stay as they were (otherwise a restore would delete cloud data).
  - Tested with Playwright against an in-memory fake of Supabase (auth + PostgREST with the
    RLS rules), two browser contexts as two phones: upload prompt, edits/goals/deletes
    reaching the other phone, coach edits never sent and overwritten, removal from a team,
    offline queue, edits during an upload, sign-out / another user, game moved between teams,
    backup restore. Not yet tried against the real project.
  - Known limitations: last write wins per record, so a live game logged on two phones at
    once overwrites itself (no warning yet); a director removed from a team loses changes not
    uploaded yet; the first-sign-in upload prompt is shown once (later: the team screen
    button); paging by offset could skip a row if more than 1000 rows change during one pull.
    (A coach's local edits of cloud teams were possible too; step 6 made those teams read-only.)
- Step 5 tested against the **real project** (browser with requests forwarded to Supabase,
  two simulated phones, the maintainer's account): first-sign-in upload prompt; only the
  chosen team uploaded, the user became its director; records clean after upload; second
  phone downloaded it; rename and delete travelled phone 1 → cloud → phone 2; sign out removed
  the synced team from the phone. Offline behaviour couldn't be simulated with that setup
  (covered by the fake-server tests). Test data deleted afterwards.
- Done in step 6 (accounts and team access; no schema change):
  - `supabase/functions/admin/index.ts` (Deno Edge Function, service role): checks the caller's
    JWT (`auth.getUser`) and `accounts.is_admin`, then `create_account { email, kind }` (reuses
    an existing auth user or creates one with `email_confirm`, inserts the `accounts` row; 409
    `exists`; no email sent) and `delete_account { user_id }` (deletes the auth user;
    memberships cascade; not yourself, not another admin). Errors are `{ error, message }`.
    Deployment: step 9 of `docs/supabase-setup.md`. Type-checked, linted and unit-tested with
    Deno against a mocked Supabase; **not yet deployed to the real project**.
  - Admin page `#/admin` (Profile → Account → "Admin", only when `isAdmin`): give access (the
    function), list accounts, change kind, remove access; all cloud teams with their members:
    add (any account, any role), change role, remove. Everything except the function goes
    straight through RLS. Online only ("Needs internet"), nothing cached.
  - Team screen of a cloud team → "People": members with roles (loaded online); directors add
    coaches by email (`add_team_coach`: added / already member / "doesn't have access yet") and
    remove coaches; anyone can leave (then `syncNow()` removes the team from the phone). The
    last-director error (23514) shows as "A team must keep at least one director".
  - Read-only coach view (`readOnlyTeam(id)` / `readOnlyGame(g)`, role `coach`): team, game and
    report screens hide every edit control and show a "Read-only" pill; tapping a player shows
    an info sheet. A central guard in the click / submit / input handlers and at drag start
    refuses anything on a read-only screen that isn't in `READ_ONLY_OK` / `READ_ONLY_FORMS`
    (navigation, settings, account, sync, PDF, player info, People, new team), with a toast.
    New games (and moving a game to another team) only offer teams that aren't read-only;
    reminders and the auto-stop don't run for read-only games (the director's phone does).
  - "+ New team" while signed in with a director (or admin) account creates a cloud team
    (`uploadTeams`), with a note on its screen; signed out or with a coach account it's local.
  - Fixed a step 5 bug: editing a cloud team's own record (e.g. renaming it) left a `moved`
    tombstone that soft-deleted the team in the cloud (`trackChanges` compared `r.teamId`,
    which team records don't have).
  - Tested with Playwright against the fake Supabase (now with the admin function, the RPC and
    member insert/update/delete with RLS and the last-director trigger): the 19 step 5 tests
    plus 13 step 6 tests (admin, director and coach phones). Not yet tried against the real
    project.
- Step 6 tested against the **real project**: the `admin` function is deployed with Verify JWT
  **on** and accepts the maintainer's real session (a forged JWT is refused by the gateway,
  no session by the function); `create_account` / `exists` / `delete_account` work; the admin
  changed an account's kind; the Admin page lists accounts; a cloud team was created,
  `add_team_coach` returned `added` / `already_member` / `no_account`; the People section
  showed the coach. Test account and team deleted afterwards. Fixed on the way: long emails
  made People / Admin rows wider than the screen (grid items now `min-width: 0`).
- Done in step 7:
  - `.github/workflows/keep-alive.yml`: reads `ping` every 2 days (and on demand); a failed
    run makes GitHub email the owner. Scheduled workflows only run from the default branch,
    so it starts once this is merged into `main`.
  - Profile → Account → "How your data is handled": what is stored, where, who sees it, how
    to delete (EN + PT). Backup hint updated for synced teams.
  - README "Cloud sync (optional)" section and file list; CLAUDE.md points to this plan.
- After the merge into `main` (danimagb/fut-academy-stats#19): **password sign-in** (email +
  password; code by email the first time / forgotten password, then choose a password;
  "Change password" on Profile) and an **Admin tab** in the bottom bar for the admin only (the
  Admin row on Profile was removed).
- Remaining: test on two real phones after merging `feature/cloud-sync` into `main` (GitHub
  Pages serves `main` only). Possible follow-ups: shared live logging on two phones (events as
  rows), Google/Apple sign-in, a read-only viewer role for parents.

- Supabase project: created by the maintainer (EU region), migration applied, admin account
  set up (user `danielmagalhaes4@gmail.com`), sign-ups off (verified), custom SMTP through a dedicated Gmail account (app password).
  Project URL: `https://qttfytuptdrovwnedofy.supabase.co`.

## Goals

- Data survives losing or changing the phone.
- The same team can be used from more than one phone, and by more than one coach.
- **Invite-only**: nobody can create an account on their own. Only the **admin** gives
  people access; team directors then decide who sees their own teams.
- The app keeps working **offline at the pitch** exactly as today; syncing happens when there
  is signal.
- Using the app **without an account** keeps working (local only, as today).
- Still a static site on GitHub Pages: no server of our own.

## Non-goals (for now)

- Public sign-up, social login (Google/Apple), passwords.
- Two phones logging the **same live game at the same time** (see "Conflicts"). Possible
  later as its own step.
- Syncing per-phone preferences (language, theme, last formation, games-page filter): these
  stay local.

## Architecture

```
 Phone (PWA, static files on GitHub Pages)
 ┌─────────────────────────────────────────┐
 │ UI  ──>  local store (localStorage)      │  always reads/writes locally first
 │              │  dirty records             │
 │              ▼                            │
 │          sync engine  ── supabase-js ─────┼──> Supabase (EU region)
 └─────────────────────────────────────────┘      ├─ Auth (email OTP, sign-ups OFF)
                                                   ├─ Postgres + Row Level Security
                                                   └─ Edge Function: admin (accounts)
```

- **Keys**: the app ships only the project URL and the *anon* (public) key in `config.js`.
  These are designed to be public. All access control is done by Row Level Security (RLS)
  in the database. The *service role* key exists only as a secret of the Edge Function and
  never goes in the repo or the app.
- **supabase-js** is vendored into the repo (a pinned version) and cached by the service
  worker, so the app still loads offline.

## Authentication, accounts and team access

There are two separate levels:

1. **Accounts**: who can use the cloud at all, and of which kind. Managed **only by the admin**.
2. **Team membership**: who sees which cloud team, with which role. Managed by that team's
   directors (coaches only) and by the admin (anyone, any role).

### Sign-in

- Supabase Auth: **"Allow new users to sign up" is turned off.**
- **Email + password** (`signInWithPassword`). The **first time**, and after a **forgotten
  password**, the user asks for a code by email instead (`signInWithOtp({ shouldCreateUser:
  false })` + `verifyOtp`); an email without an account gets no code. After a code sign-in the
  app requires choosing a password (`updateUser({ password })`, min. 8 characters; the
  requirement survives reloads). Passwords are kept by Supabase Auth only as bcrypt hashes,
  never in our tables or on the phone. A code (not a magic link) because on iPhone a link
  would open in Safari, not in the home-screen app.
- The session is kept on the phone and refreshed automatically; you stay signed in.
- **Other sign-in options (later, optional)**: Google, Apple or Microsoft through Supabase.
  Still invite-only: with sign-ups off, only someone who already has an account (same email)
  can use them. On iPhone home-screen apps the provider's redirect may come back in Safari
  instead of the app, so this needs testing on a real iPhone; the email code stays as the
  reliable option.

### Accounts (admin only)

- Table `accounts`: one row per person with access, with their email and **kind**:
  - `director` account: may create cloud teams (and upload local teams to the cloud).
  - `coach` account: may not create cloud teams; only sees the teams they were added to.
  - plus an `is_admin` flag. The admin is the maintainer; it can only be set in the Supabase
    dashboard (SQL), never from the app.
- **Bootstrap**: the maintainer creates their own user in the dashboard and marks it as admin
  with one SQL statement (see `docs/supabase-setup.md`). The admin also has a director account.
- **Giving access** (app → **Admin tab**, visible only to the admin): email + kind. The app calls
  the `admin` Edge Function, which checks the caller is admin and, with the service role,
  creates the auth user and the `accounts` row. The person then gets a code the first time and
  chooses a password.
- The admin can also list accounts, change an account's kind, and remove access (deletes
  the user; their memberships go with it).

### Team membership

- Table `team_members`: (team, user, role), role `director` or `coach`. The per-team role is
  separate from the account kind (the admin may make a coach-account director of a team).
- Whoever creates a cloud team becomes its director automatically.
- **Directors** of a team can add **coaches** to it by email, but only people who already
  have an account. An email without one gets "this person doesn't have access yet, ask the
  admin". Directors can also remove coaches from their team. They can't add or remove
  directors, change roles, or create accounts.
- The **admin** can add, remove or change the role of anyone in any team, and sees all teams
  and their members (but not their players and games, unless they're a member).
- Anyone can leave a team, except the last director (a team always keeps one director).
- Removing someone from a team: on their next sync the team disappears from their phone.

### What each role can do in a cloud team

- `director`: full access. Edits the team and players, creates and runs games (lineups, subs,
  goals, cards, clock), adds and removes coaches, deletes the team.
- `coach`: **read-only**. Sees the team, the games list, the game page and the report (and
  can share the PDF), but can't create games or change anything: no subs, goals, cards,
  clock, lineup or team/player edits. The app hides or disables those controls, and the
  database refuses the writes anyway (RLS).

### Local teams and cloud teams

- Every team is either **on this phone** (local) or **in the cloud** (synced and shared).
- Local teams work exactly as today for everyone (no account, coach or director accounts):
  create teams, players and games freely. Nothing is uploaded.
- Only **director accounts** can create cloud teams or upload a local team to the cloud. A
  coach's own local teams stay on their phone (they can be uploaded later if the account
  becomes a director).
- The read-only coach view applies to cloud teams where the role is `coach` only.
- The team list and team screen show which kind each team is ("On this phone" / "Synced").

## Data model (Postgres)

All app record ids stay as they are (text), so existing local data uploads without remapping.
New records use `crypto.randomUUID()`.

| table          | columns (main)                                                                 |
|----------------|--------------------------------------------------------------------------------|
| `accounts`     | `user_id`, `email`, `kind` (`director`/`coach`), `is_admin`, `created_at`, `created_by` |
| `teams`        | `id`, `club`, `name`, `created_by`, `updated_at`, `deleted_at`                 |
| `team_members` | `team_id`, `user_id`, `role` (`director`/`coach`), `invited_by`, `created_at`  |
| `players`      | `id`, `team_id`, `number`, `name`, `full_name`, `updated_at`, `deleted_at`     |
| `games`        | `id`, `team_id`, `date`, `status`, `data` (jsonb: the full game object), `updated_at`, `updated_by`, `deleted_at` |

- A game is stored as one JSON document (lineup, events, clock, names…), like today. This
  keeps the app logic unchanged.
- `updated_at` is set by the database (trigger), not by phone clocks.
- Deletes are **soft** (`deleted_at`), so a delete on one phone reaches the others. Rows
  deleted for 30+ days can be purged later.

### Row Level Security (the part that must be right)

- Every table has RLS **enabled** and no access for the `anon` role.
- `teams`, `players`, `games`: a signed-in user can **read** rows only for teams they are a
  member of, and **write** them only if their role in that team is `director`. Creating a
  team also needs a director (or admin) account. The admin can read all `teams` rows.
- `team_members`: members see the members of their own teams; the admin sees all. Directors
  add coaches through the `add_team_coach(team, email)` function and can remove coaches;
  the admin can do anything; anyone can leave; the last director can't be removed.
- `accounts`: you see your own row and those of people who share a team with you; the admin
  sees all and can change `kind`. Rows are created only by the `admin` Edge Function (service
  role) or in the dashboard; `is_admin` can't be changed through the API.
- **Tests**: SQL tests (pgTAP, run with `supabase test db`) that sign in as different users
  and check that a non-member can't read or change anything, a coach can read but not change
  anything (teams, players, games, members),
  and anonymous requests get nothing. These run before each schema PR is merged.

## Sync

- The UI keeps reading and writing the local store, so nothing changes offline.
- Each local record gets `updatedAt` and a `dirty` flag; deletes leave a tombstone. This is
  done automatically in `save()` by comparing every record with the last saved version, so
  the rest of the app keeps editing `db` as today.
- **Push**: dirty records are upserted to Supabase; on success the flag is cleared.
- **Pull**: fetch rows with `updated_at` newer than the last sync, for the user's teams, and
  merge them into the local store.
- When: on app start, when the app comes back to the foreground, when the network returns,
  a few seconds after a change, and with a "Sync now" button on Profile.
- A small status on Profile: "Synced 2 min ago" / "Offline, 3 changes waiting" / errors.
- Only **cloud teams** (and their players and games) are synced; local teams never leave
  the phone.
- **First sign-in** (director accounts): the app shows the local teams and asks which ones
  to upload. Uploaded teams become cloud teams with you as director. Teams you're a member of
  in the cloud are downloaded. Coach accounts just download their teams.

### Conflicts

- Rule: **last write wins per record** (per team, per player, per game).
- Fine for teams and players, and for games logged on one phone.
- Not fine if two phones log the **same live game** at the same time: one phone's events would
  overwrite the other's. For v1 the app warns when a live game was changed on another device.
  If shared live logging is wanted, a later step stores events as separate rows.

## Privacy (children's data)

- Supabase project in an **EU region**.
- Only what the app already stores: shirt name and number, optional full name, match events.
  No photos, birth dates or contacts.
- Directors can delete a team, which deletes its players and games in the cloud.
- A short note in the app saying what is stored, where, and who can see it. The club should
  confirm it is happy with this (GDPR; parental consent where needed).

## Hosting, costs and the free-tier pause

- The Supabase project is owned by the app's maintainer (personal account), in an EU region.
- The Supabase free tier is plenty for the data volume.
- Free projects are **paused after about a week without activity** and have to be restored
  from the dashboard.
- **Keeping it awake**: a scheduled GitHub Actions workflow (`keep-alive`) runs every
  2–3 days and makes a real, harmless read request to the project (a tiny `ping` table that
  anyone may read, nothing else). This kind of keep-alive is common, but Supabase decides
  what counts as activity and could change that; the Pro plan removes the pause entirely.
- **Getting notified**:
  - If the request fails (project paused or down), the workflow fails and GitHub emails you.
  - Supabase also emails the account owner about inactive/paused projects.
  - GitHub turns off scheduled workflows in repositories with no activity for 60 days and
    emails before doing so; re-enabling is one click.
- **Invisible for users**: the app is local-first, so a paused project doesn't stop anyone
  at the pitch. Changes wait on the phone and upload once the project is back. Sync problems
  only show as a quiet status on Profile ("Couldn't sync, will try again"), never as popups.
  What does stop while paused: other phones seeing new changes, and signing in on a new phone.

## Pull requests (into `feature/cloud-sync`): details

1. **Plan** (this document).
2. **Local data groundwork**, no visible change: change tracking inside `save()` (each
   changed team/player/game gets `updatedAt` and `dirty`, removed ones leave a tombstone in
   `db.deleted`), UUIDs for new records. Persistent storage (`navigator.storage.persist()`)
   already shipped separately on `main`.
3. **Database**: `supabase/` folder with SQL migrations (tables, triggers, RLS) and RLS tests,
   plus a setup guide (create the project in the EU, turn off sign-ups, enable email OTP,
   create your user). *You create the Supabase project here.*
4. **Sign-in**: Profile → Account: email + code (later: email + password, with a code the first
   time and for a forgotten password), sign out, signed-in status. Vendored
   supabase-js and `config.js`.
5. **Sync engine**: push/pull, offline queue, status and "Sync now", first sign-in upload.
6. **Accounts and team access**: `admin` Edge Function and the Admin page (give access,
   change kind, remove access, manage any team); team screen → members list, directors add
   coaches by email and remove them; leave a team; the read-only `coach` view (controls
   hidden or disabled) for cloud teams.
7. **Finishing**: `keep-alive` workflow, privacy note, delete-cloud-data option, README, test the whole flow on two
   phones. Then merge `feature/cloud-sync` into `main`.

Each PR is tested on its own. PRs 2–4 change nothing for someone who doesn't sign in.

## Decisions

- Two levels: **accounts** (admin only; kinds `director` and `coach`) and **team membership**
  (roles `director` = full access, `coach` = read-only). Directors add and remove coaches on
  their own teams, but only people who already have an account (option B).
- Teams are local or cloud; only director accounts create cloud teams.
- The app keeps working without an account (local storage only, as today); signing in adds
  cloud sync.
- The Supabase account is owned by the maintainer.
- Sign-in: email + password; a code by email the first time and for a forgotten password.
  Google/Apple/Microsoft are optional extras, after testing on iPhone.
