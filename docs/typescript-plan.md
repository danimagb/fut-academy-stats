# TypeScript + Vite plan

This work happens on the `feature/typescript` branch, as small PRs into that branch. The branch
is merged into `main` only once everything works end to end (step 10). Until then, `main`
keeps deploying from the branch exactly as it does today.

> **Every PR for this work updates the "Progress" section below**: its status, what was done,
> and anything the next step needs to know. That's how the next PR, or the next Claude session,
> knows where things stand.

## Progress

| #   | Step                                                                        | Status       | PR                            |
| --- | --------------------------------------------------------------------------- | ------------ | ----------------------------- |
| 0   | Plan and code standards                                                     | ✅ merged    | danimagb/fut-academy-stats#32 |
| 1   | Tooling skeleton (Vite, TypeScript, `package.json`)                         | ✅ merged    | danimagb/fut-academy-stats#33 |
| 2   | CI: oxlint, tsc, Vitest, build                                              | 🔄 in review | (this PR)                     |
| 3   | Supabase and config as modules (drop `vendor/`)                             | ⏳ todo      |                               |
| 4   | Service worker via vite-plugin-pwa (drop `sw.js`)                           | ⏳ todo      |                               |
| 5   | Split logic into typed modules + unit tests + validating data that comes in | ⏳ todo      |                               |
| 5b  | Database checks on what is stored (new migration)                           | ⏳ todo      |                               |
| 6   | Router, UI and screens as modules + event delegation                        | ⏳ todo      |                               |
| 7   | End-to-end smoke tests (Playwright) in CI                                   | ⏳ todo      |                               |
| 8   | Strict TypeScript                                                           | ⏳ todo      |                               |
| 9   | Deploy workflow to GitHub Pages + docs                                      | ⏳ todo      |                               |
| 10  | Merge `feature/typescript` into `main`                                      | ⏳ todo      |                               |

**Where things stand (update this with every PR):**

- Code standards are in `docs/standards/` (step 0). Every step follows them.
- Done in step 1: the app is built by Vite.
  - Commands: `npm ci`, then `npm run dev` (local server), `npm run build` (writes `dist/`) and
    `npm run preview` (serves `dist/`).
  - The code hasn't changed apart from moving files:
    - `app.js` → `src/main.js`, loaded as an ES module
    - `styles.css` → `src/styles.css`
  - `public/` is copied as-is into `dist/`. It holds the icons, the manifest, `.nojekyll`, and
    three files that later steps replace: `config.js` and `vendor/` (step 3, which also stops
    Vite's two "can't be bundled" warnings) and `sw.js` (step 4).
  - Until step 4, Vite writes fixed file names with no content hash (`assets/app.js`,
    `assets/index.css`), because `public/sw.js` lists them in `ASSETS`. Keep bumping `CACHE`
    there until step 4.
  - The feature branch can't be served straight from its files any more: open it with
    `npm run dev` or `npm run preview`. `main` keeps deploying from its files until step 10.
  - Dependencies are added in the step that first uses them: oxlint in step 2,
    `@supabase/supabase-js` in step 3, vite-plugin-pwa in step 4, `@playwright/test` in
    step 7. Step 1 adds `vite`, `typescript`, `vitest`, `happy-dom` and `prettier`.
  - Versions are pinned exactly. Vitest is 5.1.0 because `npm install` crashes on 5.0.5
    (an npm peer-dependency bug, `Cannot read properties of null (reading 'edgesOut')`).
  - TypeScript 7 (the native compiler) checks only `.ts` files for now (`checkJs: false`). The
    formatter is set up, but the code is only reformatted in step 2, so `npm run format:check`
    fails until then.
- Done in step 2: CI (`.github/workflows/ci.yml`) runs four jobs on every PR and on every
  push to `main` and `feature/**`:
  - **Lint and format:** `npm run lint` (oxlint) and `npm run format:check`
  - **Types:** `npm run typecheck`
  - **Unit tests:** `npm test`
  - **Build:** `npm run build`, keeping `dist/` as an artifact for 7 days
- The whole codebase was reformatted once with Prettier, in its own commit (it only changes
  layout). Run `npm run format` before committing, or let your editor format on save.
- `.oxlintrc.json`:
  - the `correctness` category as errors and `suspicious` as warnings
  - `eqeqeq` (`== null` allowed), `no-unused-vars` (`_` prefix to ignore), `no-var`,
    `prefer-const`, `import/no-cycle`, `import/no-default-export`, `vitest/no-focused-tests`
  - the layer and slice import rules from `docs/standards/code-organisation.md`, already set
    up for `src/shared`, `domain`, `data`, `features` and `pages`, and tested
  - `unicorn/no-array-sort` and `no-array-reverse` are off: the code sorts arrays it has
    just made, so `toSorted()` would add nothing
- The current code has no lint errors, but 21 warnings remain (`no-shadow`, mostly the local
  match-time `t` hiding the `t()` translation function, and `consistent-function-scoping`).
  They go away as the code moves into modules (steps 5–6). Warnings don't fail CI; errors do.
- The first real module is `src/shared/lib/html.ts` (`esc`, with tests in `html.test.ts`).
  `src/main.js` imports it. Modules are always strict, so `'use strict'` was removed.
- **Owner:** make the four checks required for `feature/typescript` and `main` (Settings →
  Branches → branch protection or a ruleset → require status checks: "Lint and format",
  "Types", "Unit tests", "Build").

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
- `keep-alive.yml` doesn't change. The database changes only in step 5b, which adds checks on
  what can be stored; the tables and access rules stay the same.
- **Never trust data that comes in.** Row Level Security only controls _who_ can write: only
  a team's directors can write its players and games. It doesn't control _what_ they write.
  `games.data` is a `jsonb` document with no checks, so a director could skip the app, call
  the Supabase API directly and store anything in their own team. We don't move the game
  logic to the server: the server can't know the real match time, and minutes, score and
  clock are never stored, because each phone works them out from the events. The risk is
  broken or oversized data reaching other phones, so we check data at both ends: the app
  checks what it loads (step 5) and the database rejects what is obviously wrong (step 5b).

## Steps (one PR each into `feature/typescript`; the app works after each)

### 1. Tooling skeleton (the code itself stays as it is)

- `package.json` with pinned dev dependencies: `vite`, `typescript`, `vite-plugin-pwa`,
  `vitest`, `happy-dom`, `oxlint`, `@playwright/test`. `@supabase/supabase-js` is the only
  runtime dependency. Commit `package-lock.json`.
- Add `.nvmrc` with Node 22.
- Scripts: `dev`, `build` (`vite build`), `preview`, `typecheck` (`tsc --noEmit`), `lint`
  (`oxlint`), `test` (`vitest run`), `e2e` (`playwright test`).
- `tsconfig.json` starts with `allowJs` and `strict: false`, so the current code passes.
- Add the `@/` → `src/` import alias in both `tsconfig.json` (`paths`) and `vite.config.ts`.
- Add the formatter (Prettier, settings in `docs/standards/README.md`) and an `.editorconfig`.
  The `format` and `format:check` scripts come with it.
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
- `lint` also runs `format:check`.
- Add a starter `.oxlintrc.json`: the `correctness` category as errors, `suspicious` as
  warnings, plus `no-unused-vars`, `eqeqeq`, `import/no-cycle` and `import/no-default-export`.
  Fix whatever it reports in the current code.
- Add the import rules between layers and slices from `docs/standards/code-organisation.md`.
  They only start reporting errors in step 5, once the folders exist. Use dependency-cruiser
  for any rule oxlint can't express.
- Run the formatter once over the whole codebase, in its own commit.
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

### 5. Split the logic into `domain/`, `data/` and `shared/`, with unit tests

Follow the layers in `docs/standards/code-organisation.md`.

- `src/domain/`:
  - `types.ts`: `Team`, `Player`, `Game`, `GameEvent`, `Lineup`, `Db`, `Tombstone`, `Role`,
    `Lang`
  - `clock.ts`, `game-state.ts`, `pitch.ts`, `stats.ts`, `report.ts` (the report table model),
    `formats.ts`, `titles.ts`
- `src/data/`: `store.ts` (`state`, `save()`, change tracking, migrations), `supabase.ts`,
  `sync.ts`, `persist.ts`. Shared values that change (`db`, `draft`, `renderPending`) go into
  one exported `state` object, because code can't assign to a variable it imported.
- `src/shared/`: `lib/` (`esc`, `pad`, DOM and date helpers), `i18n/` (typed so that `pt` must
  have every key in `en`), `config.ts`.
- Code that isn't moved yet stays in `src/app/legacy.ts` and imports from the new modules.
- `src/domain/validate.ts`:
  - type guards: `isTeam`, `isPlayer`, `isGame`
  - sanity checks: event times ≥ 0 and within the game's length plus the auto-stop limit, known
    event types and statuses, `playerId`s that exist in the team, text lengths within limits
  - used on everything that comes in: cloud pulls (`data/sync.ts`), backup import, and loading
    `localStorage`
  - a bad record is skipped and the user is warned; it must never crash the app
- Turn on the layer import rules for these folders.
- Vitest tests, next to each module, plus the data builders in `src/test/factories.ts`:
  - **clock:** periods, extra time, times on a period boundary, and the "forgot to press" rebuild
  - **game state from events:** minutes played, subs, goalkeeper changes, score
  - **lineup:** formation slot moves
  - **change tracking in `save()`:** `dirty`, `updatedAt`, tombstones
  - **match title and score order:** home and away
  - **translations:** `pt` has every key in `en`
  - **validation:** deliberately broken records (wrong types, negative or very large times,
    unknown event types, unknown players, huge text) are rejected

### 5b. Database checks on what is stored

- New migration `supabase/migrations/<timestamp>_data_constraints.sql` with `CHECK`
  constraints on `games`:
  - `jsonb_typeof(data) = 'object'` and `jsonb_typeof(data->'events') = 'array'`
  - `pg_column_size(data)` under a limit (about 256 KB)
  - `status` in `('scheduled', 'live', 'break', 'finished')` or null (the values `app.js`
    uses today)
  - `data->>'id' = id` and `data->>'teamId' = team_id`
- Length limits on the text fields of `players`, `teams` and `accounts`.
- Before adding the constraints, check the real data and what `app.js` writes, so nothing valid
  is rejected. Add the constraints as `NOT VALID` first if old rows might fail.
- Tests in `supabase/tests/rls.test.sql`; `bash supabase/tests/local/run.sh` must pass.
- Detailed checks on individual events stay in the app, so the game logic isn't duplicated in
  SQL.

### 6. `app/`, `pages/` and `features/`, plus event delegation

This is big, so it may be split into PRs 6a, 6b, … (for example one for the game screen).

- `src/app/`: `main.ts`, `router.ts`, `actions.ts` (the single `data-action` listener), `pwa.ts`.
  Startup and the timers move here.
- `src/shared/ui/`: sheet, `confirmSheet`, `alertSheet`, toast, icons.
- `src/pages/<page>/`, one folder per screen: games, teams, team, game-edit, game, report,
  stats, player, profile, admin.
- `src/features/<feature>/`: substitution, log-event, fix-times, formation-picker, undo,
  sign-in, team-people, backup, share-pdf, language-switch, theme-switch (the list may change
  as the work goes).
- Replace the inline `onclick="fn()"` strings with `data-action="<slice>.<verb>"`.
  `index.html` already does this for `data-action="close-sheet"`.
- Split `styles.css` into `shared/styles/` (variables, both themes, base) and one `.css` file
  per page or feature, kept next to its code.
- Turn on all the layer and slice import rules. Delete `app/legacy.ts`.

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

| Check           | Tool                              | From step             |
| --------------- | --------------------------------- | --------------------- |
| Lint            | oxlint                            | 2                     |
| Types           | `tsc --noEmit`                    | 2 (strict from 8)     |
| Unit tests      | Vitest + happy-dom                | 2 (real tests from 5) |
| Build           | Vite                              | 2                     |
| End to end      | Playwright (Chromium, phone size) | 7                     |
| Deploy to Pages | GitHub Actions                    | 9 (push to `main`)    |

## Checks for every PR

- All CI jobs pass.
- Check the app by hand on `npm run preview`, at phone size and in both themes.
- No errors in the browser console.
- Data already saved in `localStorage` still loads.
