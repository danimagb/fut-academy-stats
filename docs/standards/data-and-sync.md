# Data, storage and sync

Read `docs/cloud-sync-plan.md` before changing anything here. This file is a summary of the
rules.

## Local data
- Everything is stored under one `localStorage` key: `fut-academy-stats.v1`. **Its shape is
  a contract.** Phones that are already installed, exported backups and the cloud all depend
  on it.
  - Adding an optional field is fine. Code must handle the field being missing in older
    records (`g.fooMs ?? default`).
  - Renaming, removing or changing the meaning of a field needs a migration in
    the load step in `data/store.ts`, plus a unit test that loads the old shape.
- **Change `state.db`, then call `save()`.** `save()` compares each record with its last
  snapshot and sets `updatedAt` and `dirty` on what changed, and leaves tombstones in
  `db.deleted` for what was removed. Don't set `updatedAt` or `dirty` by hand.
- Data that comes from the cloud, or is cleaned up for it, is written with the raw write
  that skips change tracking, as explained in `cloud-sync-plan.md`. Don't use it anywhere
  else.
- New ids come from `crypto.randomUUID()`. Old, shorter ids are still valid strings: never
  parse an id.
- Data that belongs to one phone only (language, theme, filters, sign-in step) uses its own
  `fut-academy-stats.<name>` key, never the synced records.
- Wrap every `localStorage` read and write in try/catch, and fall back to defaults.

## Game data is events
- A game's truth is its **list of events**. The lineup, minutes, score and current period
  are calculated from them (`domain/game-state.ts`) and never stored. Undo removes events.
- Times: `t` is match time in milliseconds (only time actually played) and `at` is the
  wall-clock time it was recorded. The clock that is displayed is calculated (see
  `domain/clock.ts`). Don't add a stored field that duplicates something calculated.

## Supabase and sync
- `src/shared/config.ts` holds only the public URL and the **publishable** key. **Never commit a
  secret or `service_role` key, passwords, or personal data** (including in test fixtures:
  use made-up names).
- Access is enforced by Row Level Security in the database, never just by hiding things in
  the app. Any database change goes in a new file in `supabase/migrations/`, with tests in
  `supabase/tests/rls.test.sql`, and `bash supabase/tests/local/run.sh` must pass.
- Sync never blocks the UI and never loses local edits. If a sync fails, leave the records
  `dirty` and try again later.
- This is children's data. Collect nothing new without updating the privacy note, and log
  nothing that identifies a player.
