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
| 2 | Local data groundwork | 🔄 in review | danimagb/fut-academy-stats#12 |
| 3 | Database (tables, RLS, tests) + Supabase setup guide | ⏳ next | – |
| 4 | Sign-in (email code) | ⏳ | – |
| 5 | Sync engine | ⏳ | – |
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
- Next (step 3): the maintainer creates the Supabase project (EU region) and gives the
  project URL and the anon key. Nothing in the app talks to Supabase yet.
- Supabase project: not created yet.

## Goals

- Data survives losing or changing the phone.
- The same team can be used from more than one phone, and by more than one coach.
- **Invite-only**: nobody can create an account on their own. Access is given per team, by
  email invitation from a team director.
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
                                                   └─ Edge Function: invite-coach
```

- **Keys**: the app ships only the project URL and the *anon* (public) key in `config.js`.
  These are designed to be public. All access control is done by Row Level Security (RLS)
  in the database. The *service role* key exists only as a secret of the Edge Function and
  never goes in the repo or the app.
- **supabase-js** is vendored into the repo (a pinned version) and cached by the service
  worker, so the app still loads offline.

## Authentication and invitations

- Supabase Auth: **"Allow new users to sign up" is turned off.**
- Sign-in: the user types their email, then receives a **6-digit code** by email and types it
  in the app (`signInWithOtp({ shouldCreateUser: false })` + `verifyOtp`). An email that
  wasn't invited gets no code. A code is used instead of a magic link because on iPhone the
  link would open in Safari, not in the home-screen app, so the app wouldn't be signed in.
- The session is kept on the phone and refreshed automatically; you stay signed in.
- **First account (bootstrap)**: the project admin (you) creates their own user in the
  Supabase dashboard (Authentication → Add user).
- **Inviting someone** (in the app, team screen → Coaches → Invite):
  1. A director enters an email and a role (`director` or `coach`).
  2. The app calls the `invite-coach` Edge Function with the director's session.
  3. The function checks the caller is a **director of that team**, creates the auth user if
     it doesn't exist yet (using the service role key), and adds a `team_members` row.
  4. The invitee opens the app, signs in with their email and the code, and sees the team.
- Removing a coach deletes their `team_members` row; on their next sync the team disappears
  from their phone.
- Roles:
  - `director`: full access. Edits the team and players, creates and runs games (lineups,
    subs, goals, cards, clock), invites and removes coaches, deletes the team. The person who
    creates a team in the cloud becomes its director.
  - `coach`: **read-only**. Sees the team, the games list, the game page and the report
    (and can share the PDF), but can't create games or change anything: no subs, goals,
    cards, clock, lineup or team/player edits. The app hides or disables those controls,
    and the database refuses the writes anyway (RLS).
- **Other sign-in options (later, optional)**: Google, Apple or Microsoft sign-in through
  Supabase. Still invite-only: with sign-ups off, only someone already invited (same
  email) can use it. On iPhone home-screen apps the provider's redirect may come back in
  Safari instead of the app, so this needs testing on a real iPhone; the email code stays
  as the reliable option.

## Data model (Postgres)

All app record ids stay as they are (text), so existing local data uploads without remapping.
New records use `crypto.randomUUID()`.

| table          | columns (main)                                                                 |
|----------------|--------------------------------------------------------------------------------|
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
  member of (`exists (select 1 from team_members where team_id = … and user_id = auth.uid())`),
  and **write** them only if their role in that team is `director`.
- Deleting a team and managing members: directors only.
- `team_members`: members can see the members of their own teams; only directors can remove
  them; inserts happen through the Edge Function (and on team creation, via a database
  function that adds the creator as director).
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
- **First sign-in**: the app shows the local teams and asks which ones to upload. Uploaded
  teams are created in the cloud with you as director. Teams already in the cloud are downloaded.

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
6. **Coaches and invites**: `invite-coach` Edge Function, coaches list on the team screen,
   invite and remove, roles. The read-only `coach` view (controls hidden or disabled).
7. **Finishing**: `keep-alive` workflow, privacy note, delete-cloud-data option, README, test the whole flow on two
   phones. Then merge `feature/cloud-sync` into `main`.

Each PR is tested on its own. PRs 2–4 change nothing for someone who doesn't sign in.

## Decisions

- Roles: `director` (full access) and `coach` (read-only). More can be added later.
- The app keeps working without an account (local storage only, as today); signing in adds
  cloud sync.
- The Supabase account is owned by the maintainer.
- Sign-in: email code first. Google/Apple/Microsoft are optional extras, after testing on iPhone.
