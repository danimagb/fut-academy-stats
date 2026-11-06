# Account-only plan (no more "teams on this phone")

Today the app works without an account (everything on the phone) and, signed in, mixes
**local** teams (only on that phone) with **synced** teams (in a club, in the cloud). This plan
removes the first mode: the app needs an account, and every team is a club's team in the cloud.
Running a game still works offline (see "Offline" below), as it does now.

> **Every PR for this work updates the "Progress" section below.**

## Progress

| #   | Step                                                            | Status   | PR  |
| --- | --------------------------------------------------------------- | -------- | --- |
| 1   | Plan (this document)                                            | 📝 draft |     |
| 2   | Sign-in first: the app opens on sign-in when there's no session | ⏳ to do |     |
| 3   | Teams already on phones: upload into the club, or export        | ⏳ to do |     |
| 4   | Remove the local mode (code, screens, texts)                    | ⏳ to do |     |
| 5   | Tests on accounts only, README / privacy text, two phones       | ⏳ to do |     |

## Why

- **One way of working.** "Local" and "Synced" teams have different rules (who can edit, what
  works offline, uploading, the "On this phone" group, Local / Synced badges, exceptions in the
  online-only checks). That makes screens and code harder to follow.
- **No lost teams.** A team that lives only on a phone is gone with the phone.
- It matches the rule already in place: offline, only running a game works.

## What changes for people

- **Opening the app without a session**: a sign-in screen (the current _Sign in_ / _Activate
  account_ tabs from Profile → Account), no tab bar. Nothing else can be opened.
- **Signed in, without access yet** (no account row): "You don't have access yet. Ask the
  admin." and Sign out.
- **Signed in, in a club but with no team yet** (staff): "You're not in a team yet. The club's
  coordinator adds you." Coordinators see their club and "+ New team".
- **Offline**: stays as today. With a session saved on the phone, the app opens offline and the
  teams, players and games downloaded last time are there; games can be run and sync later.
  Only the very first sign-in on a phone needs the internet.
- **Sign out**: removes everything from the phone (as it already does for synced teams), after
  warning about game changes not uploaded yet. The app goes back to the sign-in screen.
- **New team**: always in a club (coordinators, the admin through a club).
- **Backup** (Profile): see question 2.

## Teams already on phones

The phones in use may have local teams (with players and games). On the first start of the new
version (signed in, or after signing in):

- **Coordinators**: the existing "Sync your teams?" sheet, now required: each local team is
  uploaded into one of their clubs, or exported to a file and removed (question 1).
- **Everyone else**: they can't upload. Offer "Export a copy" (the backup file), then remove
  them; or keep them read-only until the coordinator recreates the team (question 1).
- Nothing is removed without the person choosing it.

## Code that goes

- Local-team branches: `isCloudTeam()` checks (28, in sync, store, access, clubs, online-only,
  team, game-edit, sync-status), `localTeams()`, the "On this phone" group, Local / Synced
  badges, the upload button on a team screen, new local teams, local-team exceptions in
  `online-only.ts` and on the New game button.
- The "no Supabase" path (`sb` null: the app without cloud) and its texts (`cloudUnavailable`,
  `peopleSignIn`…).
- `db.sync.uploads` and the refused-upload handling, once step 3 has run on every phone.
- Kept: the local store (`localStorage`) as the offline copy, the sync engine, the
  change tracking for games.

## Tests

14 of the 31 e2e test files run without an account (they create local teams through
`helpers.createTeam`): they move to a signed-in coordinator with the cloud stub (a helper that
signs in and creates the team in the stub's club). Store and sync unit tests lose the local-team
cases. New tests: the sign-in gate, the first start with local teams, sign-out back to sign-in.

## Steps (PRs, on a feature branch `feature/account-only`)

2. **Sign-in first**: the gate screen, "no access yet" and "no team yet" states; tab bar only
   signed in. Local teams still work underneath (nothing removed yet).
3. **Teams on phones**: the first-start flow (upload into the club / export / keep read-only).
4. **Remove the local mode**: the code above, texts in `en` and `pt`, the README's "Using it
   without an account".
5. **Tests and finishing**: e2e moved to accounts, docs, privacy text; test on two phones;
   merge into `main` (no database change: nothing is applied to Supabase).

## Decisions (with the maintainer)

1. **Local teams**: nobody else uses the app, so there is no migration for other people. Step 3
   is only a safeguard: a local team still on a phone is offered once for upload into the
   coordinator's club.
2. **Backup**: Import goes. Export: _to decide_ (recommended: keep it as "Export a copy of the
   data", because the Supabase free plan has no backups).
3. **The admin** creates teams only in clubs they coordinate (as now).
4. **No demo**: without a session the app shows the sign-in / activate account screen.
