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

## TypeScript migration

The app is moving to TypeScript modules with a Vite build and CI checks (oxlint, Vitest,
Playwright). This happens on the `feature/typescript` branch, through PRs into it.
**`docs/typescript-plan.md`** lists every step, and its "Progress" section records where things
stand. Read it before working on that branch, and update it in every PR for that work.

Code on that branch follows **`docs/standards/`**: TypeScript style, the frontend folder
structure (`app` → `pages` → `features` → `data` → `domain` → `shared`, with imports only going
down), the UI, data, testing and git/PR rules. Read `docs/standards/README.md` first.

On `feature/typescript` the app is built with Vite (`npm ci`, `npm run dev` / `build` /
`preview`): the code is in `src/`, and static files are in `public/`. Before pushing, run
`npm run lint && npm run typecheck && npm test && npm run format:check`, and `npm run e2e` for
anything that changes a screen; CI runs the same. The
Conventions below still apply, with those paths. On this branch, the Supabase URL and
publishable key are in `src/shared/config.ts`, and supabase-js comes from npm (`vendor/` is
gone). The service worker is `src/sw.ts`, built by vite-plugin-pwa: **don't bump `CACHE`**
(there isn't one). Each build updates installed apps on its own.

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
