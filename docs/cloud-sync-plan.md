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
| 4 | Sign-in (email code) | 🔄 in review | (this PR) |
| 5 | Sync engine | ⏳ next | – |
| 6 | Directors, coaches and invites; read-only coach view | ⏳ | – |
| 7 | Finishing (keep-alive, privacy, README), test on two phones, merge into `main` | ⏳ | – |

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
  - A team's creator becomes its director automatically (trigger). Members are added only by
    the service role (dashboard or the step 6 Edge Function). The last director of a team
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
- Next (step 5): sync engine. Sync only cloud teams; a team needs a "cloud" mark locally
  (see "Local teams and cloud teams").
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
- The user types their email, then receives a **6-digit code** by email and types it in the
  app (`signInWithOtp({ shouldCreateUser: false })` + `verifyOtp`). An email without an
  account gets no code. A code is used instead of a magic link because on iPhone the link
  would open in Safari, not in the home-screen app, so the app wouldn't be signed in.
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
- **Giving access** (app → Admin page, visible only to the admin): email + kind. The app calls
  the `admin` Edge Function, which checks the caller is admin and, with the service role,
  creates the auth user and the `accounts` row. The person then signs in with the code.
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
4. **Sign-in**: Profile → Account: email + 6-digit code, sign out, signed-in status. Vendored
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
- Sign-in: email code first. Google/Apple/Microsoft are optional extras, after testing on iPhone.
