# Notes for Claude sessions

Fut Academy Stats is a phone web app (PWA) for youth football games: TypeScript built with Vite,
published to GitHub Pages from `main` by a GitHub Actions workflow. See `README.md` for what it
does.

## Cloud sync

The app is **account-only** (no teams that live only on a phone: `docs/account-only-plan.md`);
games run offline from the phone's copy and sync later. Cloud sync with Supabase (invite-only,
local-first) was built on the `feature/cloud-sync` branch in steps; **`docs/cloud-sync-plan.md`** describes the design and
its "Progress" section records what was done in each step and the known limitations. Clubs,
coordinators and the team roles (club `manager` / `staff`, team `manager` / `coach`; UI:
Coordenador, Diretor, Treinador) and club logos came after, on `feature/clubs`:
**`docs/clubs-plan.md`**. Read both before changing storage, sync, sign-in or the database. Database changes go in a new file in
`supabase/migrations/` with tests in `supabase/tests/rls.test.sql`
(`bash supabase/tests/local/run.sh` must pass).

**Merging into `main` deploys to Supabase**: the Supabase GitHub integration applies new
migrations and deploys the Edge Functions in `supabase/config.toml` (docs/supabase-setup.md,
step 10). So a migration must reach `main` together with the app code that works with it
(build such changes on a feature branch), migrations are never edited after they reach `main`
(add a new one), and `supabase/config.toml` must keep having no `[remotes]` block for
production unless its `[auth]` settings really should overwrite production's.

## TypeScript migration

The move from one `app.js` to TypeScript modules (Vite, oxlint, Vitest, Playwright) was done on
`feature/typescript` in steps and is on `main`; **`docs/typescript-plan.md`** lists them and its
"Progress" section records what was done. All code is `.ts` and passes `strict`; `any` and
`@ts-nocheck` / `@ts-ignore` fail the lint.

## Conventions

- The app is TypeScript in `src/`, built with Vite (`npm ci`, `npm run dev` / `build` / `preview`).
  Code follows **`docs/standards/`** (start with its `README.md`): the layers `app` → `pages` →
  `features` → `data` → `domain` → `shared`, imports only going down (oxlint enforces it).
- Before pushing: `npm run lint && npm run typecheck && npm test && npm run format:check`, and
  `npm run e2e` for anything that changes a screen. CI runs the same and must pass.
- `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`, after CI on `main` passes. The service worker
  (`src/sw.ts`, built by vite-plugin-pwa) updates installed apps on every build: there is no
  cache version to bump.
- Every user-facing string is in `I18N` (`src/shared/i18n/i18n.ts`) in both `en` and `pt`
  (European Portuguese); TypeScript checks that both have the same keys.
- Colours are CSS variables on `:root` with light-theme values under `[data-theme="light"]`
  (`src/shared/styles/variables.css`); new colours need both. Every CSS file is listed in
  `src/app/styles.css`, in cascade order.
- Data lives in `localStorage` (`fut-academy-stats.v1`). Edit `db`, then call `save()`
  (`src/data/save.ts`); `save()` tracks changed and deleted records for sync. Everything that
  comes in (storage, backups, the cloud) goes through `src/domain/validate.ts`.
- `src/shared/config.ts` has the Supabase URL and publishable key (public). Never commit a
  secret / service_role key or passwords.
- Check changes in a browser at phone size (Playwright with Chromium is available in cloud
  sessions), in both themes when the change is visual.
