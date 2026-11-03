# Notes for Claude sessions

Fut Academy Stats is a phone web app (PWA) for youth football games: plain HTML/CSS/JS with no
build step, hosted on GitHub Pages from `main`. See `README.md` for what it does.

## Cloud sync

Optional cloud sync with Supabase (invite-only, director/coach roles, local-first) was built on
the `feature/cloud-sync` branch in steps; **`docs/cloud-sync-plan.md`** describes the design and
its "Progress" section records what was done in each step and the known limitations. Read it
before changing storage, sync, sign-in or the database. Database changes go in a new file in
`supabase/migrations/` with tests in `supabase/tests/rls.test.sql`
(`bash supabase/tests/local/run.sh` must pass).

## Conventions

- `app.js` holds all logic (storage, views, clock, events, report/PDF), `styles.css` all
  styles, `sw.js` the offline cache.
- **Bump `CACHE` in `sw.js`** with every change to the app's files, so installed apps update.
- Every user-facing string is in `I18N` in both `en` and `pt` (European Portuguese).
- Colours are CSS variables on `:root` with light-theme values under `[data-theme="light"]`;
  new colours need both.
- Data lives in `localStorage` (`fut-academy-stats.v1`). Edit `db`, then call `save()`;
  `save()` tracks changed and deleted records for sync.
- `config.js` has the Supabase URL and publishable key (public). Never commit a secret /
  service_role key or passwords. `vendor/` holds pinned third-party files; list new ones in
  `ASSETS` in `sw.js`.
- Check changes in a browser at phone size (Playwright with Chromium is available in cloud
  sessions), in both themes when the change is visual.
