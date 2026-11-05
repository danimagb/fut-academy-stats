# TypeScript + Vite plan

This work happens on the `feature/typescript` branch, as small PRs into that branch. The branch
is merged into `main` only once everything works end to end (step 10). Until then, `main`
keeps deploying from the branch exactly as it does today.

> **Every PR for this work updates the "Progress" section below**: its status, what was done,
> and anything the next step needs to know. That's how the next PR, or the next Claude session,
> knows where things stand.

## Progress

| # | Step | Status | PR |
|---|------|--------|----|
| 0 | Plan | 🔄 in review | (this PR) |
| 1 | Tooling skeleton (Vite, TypeScript, `package.json`) | ⏳ todo | |
| 2 | CI: oxlint, tsc, Vitest, build | ⏳ todo | |
| 3 | Supabase and config as modules (drop `vendor/`) | ⏳ todo | |
| 4 | Service worker via vite-plugin-pwa (drop `sw.js`) | ⏳ todo | |
| 5 | Split logic into typed modules + unit tests | ⏳ todo | |
| 6 | Router, UI and screens as modules + event delegation | ⏳ todo | |
| 7 | End-to-end smoke tests (Playwright) in CI | ⏳ todo | |
| 8 | Strict TypeScript | ⏳ todo | |
| 9 | Deploy workflow to GitHub Pages + docs | ⏳ todo | |
| 10 | Merge `feature/typescript` into `main` | ⏳ todo | |

**Where things stand (update this with every PR):**

- Nothing has been built yet. The app is still `app.js` / `styles.css` / `sw.js`, with no build.

## Why

`app.js` is about 3,900 lines in one file: I18N, storage and change tracking, the clock, the
pitch and game state, the router, 12 `view*()` screens that build HTML strings, cloud sync
and sign-in, and the report/PDF. It has no types, no tests and no linter. The goal is code
that is organised and type-checked, with CI checks on every PR. That is also the groundwork
for a later move to Vue (not part of this plan).

**No change in behaviour.** The screens stay the same. The data stays the same:
`localStorage` key `fut-academy-stats.v1`, and the same record shapes, because sync relies
on them. The app stays installable and keeps working offline, still hosted on GitHub Pages.

## Decisions

- **Real `.ts` files compiled by Vite.** We chose this over JSDoc types in `.js` files: it is
  nicer to write and it is what Vue uses. Because the code now needs compiling, GitHub Pages
  deploys from a GitHub Actions workflow instead of serving the branch's files directly.
- **Screens keep building HTML strings** for now. Vue (later) can replace them one screen at
  a time. The modules made in step 5 become its non-UI layer.
- **oxlint** for lint and **Vitest** for unit tests, because both are fast. **Playwright**
  runs the end-to-end tests; Chromium is already available in cloud sessions.
- **vite-plugin-pwa** generates the service worker, so `sw.js`, its `ASSETS` list and the
  manual `CACHE` bump go away.
- **Supabase comes from npm**, pinned to the same version (`@supabase/supabase-js@2.118.0`),
  instead of the copy in `vendor/`.
- `keep-alive.yml` and `supabase/` don't change. Nothing in this plan touches the database.

## Steps (one PR each into `feature/typescript`; the app works after each)

### 1. Tooling skeleton (the code itself stays as it is)
- `package.json` with pinned dev dependencies: `vite`, `typescript`, `vite-plugin-pwa`,
  `vitest`, `happy-dom`, `oxlint`, `@playwright/test`. `@supabase/supabase-js` is the only
  runtime dependency. Commit `package-lock.json`.
- Add `.nvmrc` with Node 22.
- Scripts: `dev`, `build` (`vite build`), `preview`, `typecheck` (`tsc --noEmit`), `lint`
  (`oxlint`), `test` (`vitest run`), `e2e` (`playwright test`).
- `tsconfig.json` starts with `allowJs` and `strict: false`, so the current code passes.
- `vite.config.ts` uses `base: './'` (the site lives under `…github.io/fut-academy-stats/`) and
  holds the Vitest config (`environment: 'happy-dom'`).
- `index.html` becomes Vite's entry. Icons, the manifest and `.nojekyll` move to `public/`, and
  `app.js` moves to `src/main.js`. Add `dist/` to `.gitignore`.

### 2. CI (`.github/workflows/ci.yml`)
- Runs on PRs, and on pushes to `main` and `feature/**`.
- Four jobs run in parallel:
  - `lint` (oxlint)
  - `typecheck` (tsc)
  - `test` (Vitest)
  - `build` (Vite, uploads `dist/` as an artifact)
- Uses the Node version from `.nvmrc` and caches npm. `concurrency` cancels runs that a
  newer push has replaced.
- Add a starter `.oxlintrc.json`: the `correctness` category as errors, `suspicious` as
  warnings, plus `no-unused-vars` and `eqeqeq`. Fix whatever it reports in the current code.
- Add one example Vitest test, so the `test` job has something to run.
- Manual step for the repo owner: make these checks required for `feature/typescript` and
  `main`, in Settings → Branches.

### 3. Supabase and config as modules
- Replace `window.supabase` and the copy in `vendor/` with
  `import { createClient } from '@supabase/supabase-js'`.
- Replace `config.js` / `window.FAS_CONFIG` with `src/config.ts`. It still holds only the public
  URL and the publishable key.
- Delete `vendor/`.

### 4. Service worker through vite-plugin-pwa
- Use `VitePWA({ registerType: 'autoUpdate', manifest, workbox: { globPatterns: ['**/*'] } })`.
- Check that a phone with the app installed from the old `sw.js` switches to the new service
  worker and keeps its data.

### 5. Split the logic into typed modules, with unit tests
- `src/types.ts`: `Team`, `Player`, `Game`, `GameEvent`, `Lineup`, `Db`, `Tombstone`, `Role`,
  `Lang`.
- One module per area, all `.ts`:
  - `src/i18n.ts`: typed so that `pt` must have every key in `en`
  - `src/theme.ts`
  - `src/storage.ts`
  - `src/helpers.ts`
  - `src/clock.ts`
  - `src/pitch.ts`
  - `src/game-state.ts`
  - `src/auth.ts`
  - `src/sync.ts`
  - `src/report.ts`
- Shared values that change (`db`, `draft`, `renderPending`) go into one exported `state`
  object, because code can't assign to a variable it imported.
- Vitest tests for:
  - **clock:** periods, extra time, times on a period boundary, and the "forgot to press" rebuild
  - **game state from events:** minutes played, subs, goalkeeper changes, score
  - **lineup:** formation slot moves
  - **change tracking in `save()`:** `dirty`, `updatedAt`, tombstones
  - **match title and score order:** home and away
  - **translations:** `pt` has every key in `en`

### 6. Router, UI and screens as modules, plus event delegation
- `src/router.ts`; `src/ui.ts` (sheet, confirm and alert dialogs); `src/views/*.ts`, one file per
  screen.
- Replace the inline `onclick="fn()"` strings with `data-action` attributes and one typed
  listener on `document`. `index.html` already does this for `data-action="close-sheet"`.
- Move the timers and startup into `src/main.ts`.
- Split the styles into `src/styles/*.css`, imported from `main.ts`.

### 7. End-to-end smoke tests (Playwright, phone size)
- What the tests do:
  - create a team and players, then create a game
  - run the clock through both halves; log a goal and a sub, and undo
  - finish the game and open the report
  - open stats and a player sheet
  - switch EN/PT and toggle the theme
  - reload with no network and check the app still loads
- The tests run against `vite preview`. Add an `e2e` CI job that runs after `build` and keeps
  screenshots when a test fails.

### 8. Strict TypeScript
- Turn on `strict` and remove `allowJs`. Fix what it finds; list the real bugs in the PR.
- Turn on oxlint's `typescript` plugin.

### 9. Deploy workflow and docs
- `.github/workflows/deploy.yml` runs on every push to `main`. It builds the app, then runs
  `actions/upload-pages-artifact` (`dist`) and `actions/deploy-pages`. Permissions:
  `pages: write`, `id-token: write`.
- Update `CLAUDE.md` Conventions:
  - describe the `src/` layout and the npm scripts
  - remove the "bump `CACHE`" rule and the `vendor/` note
  - keep the I18N, colour and `save()` rules
- Update the README's "Run locally" section.

### 10. Merge into `main`
- Before merging, the repo owner changes Settings → Pages → Source to **GitHub Actions**.
- After merging, check:
  - the live site
  - that an installed app updates and keeps its data
  - that sign-in and sync still work

## CI summary

| Check | Tool | From step |
|---|---|---|
| Lint | oxlint | 2 |
| Types | `tsc --noEmit` | 2 (strict from 8) |
| Unit tests | Vitest + happy-dom | 2 (real tests from 5) |
| Build | Vite | 2 |
| End to end | Playwright (Chromium, phone size) | 7 |
| Deploy to Pages | GitHub Actions | 9 (push to `main`) |

## Checks for every PR
- All CI jobs pass.
- Check the app by hand on `npm run preview`, at phone size and in both themes.
- No errors in the browser console.
- Data already saved in `localStorage` still loads.
