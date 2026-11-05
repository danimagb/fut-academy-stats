# TypeScript + Vite plan

This work happens on the `feature/typescript` branch, as small PRs into that branch. The branch
is merged into `main` only once everything works end to end (step 10). Until then, `main`
keeps deploying from the branch exactly as it does today.

> **Every PR for this work updates the "Progress" section below**: its status, what was done,
> and anything the next step needs to know. That's how the next PR, or the next Claude session,
> knows where things stand.

## Progress

| #   | Step                                                               | Status       | PR                            |
| --- | ------------------------------------------------------------------ | ------------ | ----------------------------- |
| 0   | Plan and code standards                                            | ✅ merged    | danimagb/fut-academy-stats#32 |
| 1   | Tooling skeleton (Vite, TypeScript, `package.json`)                | ✅ merged    | danimagb/fut-academy-stats#33 |
| 2   | CI: oxlint, tsc, Vitest, build                                     | ✅ merged    | danimagb/fut-academy-stats#35 |
| 3   | Supabase and config as modules (drop `vendor/`)                    | ✅ merged    | danimagb/fut-academy-stats#36 |
| 4   | Service worker via vite-plugin-pwa (drop `sw.js`)                  | ✅ merged    | danimagb/fut-academy-stats#37 |
| 5.1 | Shared basics and types: I18N, format helpers, data types, formats | ✅ merged    | danimagb/fut-academy-stats#38 |
| 5.2 | Game logic: clock, pitch, game state, titles, stats + tests        | ✅ merged    | danimagb/fut-academy-stats#39 |
| 5.3 | Storage, change tracking, validating data that comes in            | ✅ merged    | danimagb/fut-academy-stats#40 |
| 5.4 | Supabase client, sync and sign-in logic                            | 🔄 in review | danimagb/fut-academy-stats#41 |
| 5.5 | Database checks on what is stored (new migration)                  | ⏳ todo      |                               |
| 6   | Router, UI and screens as modules + event delegation               | ⏳ todo      |                               |
| 7   | End-to-end smoke tests (Playwright) in CI                          | ⏳ todo      |                               |
| 8   | Strict TypeScript                                                  | ⏳ todo      |                               |
| 9   | Deploy workflow to GitHub Pages + docs                             | ⏳ todo      |                               |
| 10  | Merge `feature/typescript` into `main`                             | ⏳ todo      |                               |

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
- Done in step 3: Supabase comes from npm and the config is a module.
  - `@supabase/supabase-js` is pinned to 2.118.0 (the version that was in `vendor/`) and is
    bundled into `assets/app.js`, which is now about 342 KB (97 KB gzipped). That's about the
    same as before, when `app.js` (127 KB) and the vendored file (218 KB) were separate.
  - `src/shared/config.ts` exports `CLOUD`, holding the public URL and the publishable key
    (the same values as before). `config.js`, `vendor/` and `window.FAS_CONFIG` /
    `window.supabase` are gone, and so are Vite's two "can't be bundled" warnings.
  - The build writes `dist/licenses.md` with the licences of the bundled packages (MIT for
    supabase-js). Before, `vendor/supabase-js-LICENSE` did this job.
  - `public/sw.js` no longer lists those two files; `CACHE` is v54.
- Done in step 4: the service worker is built from `src/sw.ts` by vite-plugin-pwa (the
  `injectManifest` strategy, with Workbox 7.4).
  - It **precaches every built file**, so the app opens offline. File names carry content
    hashes again, and **there's no `CACHE` to bump**: every build gets a new precache list,
    and installed apps update on their next visits.
  - The built file is still `dist/sw.js`, at the same scope, and `src/main.js` still registers
    `sw.js`. Installed apps find the new worker where the old one was.
  - A new version takes over straight away (`skipWaiting` + `clientsClaim`, as before).
    Opening any `#/…` route serves the precached `index.html`.
  - On activation it deletes the caches of the old hand-written worker
    (`fut-academy-stats-v*`).
  - **Upgrade tested:** I installed the step 3 build (old `sw.js`, cache v54) in a browser and
    saved a team, then served the new build at the same address.
    - The first reload still showed the old app, served from its cache, while the new worker
      installed. This is the same "updates on the next visit" behaviour as before.
    - The next reload served the new app with hashed files. The v54 cache was gone, the team
      was still there, and an offline reload worked.
  - `public/manifest.webmanifest` is used as it is (`manifest: false`).
  - The worker is type-checked separately (`tsconfig.sw.json`, with the `WebWorker` lib), so
    `npm run typecheck` now runs two `tsc` passes.
- Done in step 5.1: the first modules moved out of `src/main.js`, which is now 4,328 lines (from 5,155).
  - **`shared/i18n/i18n.ts`** holds `I18N`, `t()`, `locale()`, `getLang()` and `setLang()`.
    - `pt` is typed `Record<MessageKey, string>`, so a missing or extra Portuguese key fails
      `npm run typecheck`. I checked this by deleting one key.
    - `main.js` still reads and saves the language (`fut-academy-stats.lang`) and sets
      `<html lang>`. The module only holds the current value.
  - **`shared/lib/format.ts`** (`pad`, `fmtClock`, `fmtMins`, `mmss`, `isoDate`, `pct`) and
    **`shared/lib/dom.ts`** (`$`, `$$`).
  - **`domain/types.ts`**: the stored shapes (`Team`, `Player`, `Game`, `GameEvent` as a union
    on `type`, `Mark`, `Clock`, `Lineup`, `Tombstone`, `SyncState`, `Db`), worked out from what
    the code reads and writes. **`domain/formats.ts`**: `FORMATS`, `FORMATIONS`,
    `formationsFor`.
  - **`src/test/factories.ts`**: `makeTeam`, `makePlayer`, `makeGame`, `ev`, `at('mm:ss')`.
  - Tests:
    - translations: the same keys in both languages, no string empty in only one, the same
      `{placeholders}`, and `t()` filling them
    - the format helpers
    - formations adding up to the team size
  - oxlint now has `no-undef` as an error. It caught a `lang` reference that the move had left
    behind (the language buttons on Profile).
  - The standards now let `domain/` use `t()` from `shared/i18n` for labels, and say what a
    domain "operation" may change (`code-organisation.md`).
  - The language from the browser, the EN/PT switch (saved, and kept after a reload) and both
    themes were checked in Playwright.
- Done in step 5.2: the game logic is in `src/domain/`, and `main.js` is down to 4,043 lines.
  - **`clock.ts`**:
    - match time, start/stop, the clock shown, period labels, timeline times
    - `endPeriod`
    - `timeCheck`: a pure "remind / auto-stop / nothing" decision, which `checkTime` in
      `main.js` acts on (save, vibrate, toast)
    - `applyFix`: "I forgot to press the button"
    - Every function takes `now` instead of reading the real time.
  - **`game-state.ts`**: `deriveState(g, now)` (who's on, GK, score, minutes, cards, lineup),
    and `planMove`, which is what dragging a player or "To goal" means.
  - **`pitch.ts`** (`formationOf`, `slotCoords`, `fitLineup`, `startLineup`), **`players.ts`**
    (`byNumber`, `sortIds`, `pname`) and **`titles.ts`** (team and match titles, period names,
    `seasonOf`).
  - **`stats.ts`**: finished games, seasons, `teamStats`, `playerStats`, `resultOf`,
    `gameLength`.
  - `main.js` keeps thin wrappers that pass `Date.now()` and `db`: `matchTime`, `derive`,
    `formationOf`, `teamStats` and others. HTML-producing helpers (`scoreHtml`, `describe`,
    `subLine`, `formatLine`) stay with the screens for step 6.
  - 49 new tests, covering:
    - the 2nd half starting at 20:00 after a long 1st half
    - extra time as `20:00 (+02:00)`, and times on a period boundary
    - events logged during the break, and half-time subs shown at 20:00
    - reminders every 2 minutes, and auto-stop (including old games with no `maxExtra`)
    - the "forgot to press" fix re-timing events from their wall-clock time
    - minutes played (extra time included), subs, goalkeeper changes, red cards (the team
      one short, the GK sent off), and position swaps
    - lineups and formations
    - titles in both languages
    - the August–July season and season totals
- Done in step 5.3: storage, change tracking, and checks on data that comes in.
  - **`data/store.ts`**:
    - It holds `db` as a live binding: importers always see the current store, and `setDb()`
      replaces it on a backup restore.
    - `initStore()` loads the store once at startup, so importing the module does nothing.
    - It also has `load`, `normalize`, `normalizeSync`, `syncGameTeams`, `trackChanges`,
      `saveStore`, `saveQuiet`, `isCloudTeam`, `teamIdOf`, `recordKey`, `RECORD_KINDS` and
      `dropInvalid`.
    - `save()` in `main.js` is `saveStore()`, then the persistence request, then the sync
      schedule.
  - **`data/persist.ts`**: the persistent-storage request. **`shared/lib/id.ts`**: `uid`.
  - **`domain/validate.ts`** checks at two levels (see `docs/standards/data-and-sync.md`):
    - `checkShape` is used on load: a record that fails is left out and kept in
      `fut-academy-stats.rejected`.
    - `checkIncoming` (shape plus sanity) is used on backup imports and cloud pulls.
    - One toast says how many records were left out (new I18N keys `skippedN`/`skippedN1`).
  - **Checked against the app's own data:** the stores from two Playwright games, one with
    goals, a goal against, half time and full time, the other with a GK change and a time
    fix, pass both levels. A unit test found that data from before teams existed (no
    `teamId`) would have been rejected; that's fixed, and there's a test for it.
  - 26 new tests:
    - `store.test.ts`: migrations, change tracking (stamps, tombstones, restore, quiet saves,
      "moved" tombstones), and setting damaged records aside on load
    - `validate.test.ts`: valid, old and long games pass; broken and implausible records fail
  - Playwright checks:
    - A damaged game in `localStorage`: the app opens, shows the toast, and keeps the game
      aside.
    - A backup with a goal by a player who isn't in the squad: the restore leaves that game
      out and says so.
- Done in step 5.4: the sync engine and the Supabase client are in `src/data/`, and `main.js`
  is down to 3,557 lines.
  - **`data/sync.ts`** is the sync engine (push, pull, single-flight runs, the sign-out epoch,
    refusals, removing teams from the phone).
    - It doesn't know about screens. `main.js` calls `configureSync({ client, canSync,
userId, request, onStatus, onChange, onRejected, afterSync })` once.
    - `runSync()` is the core run. `syncNow()` in `main.js` loads the account row first when
      needed, then calls it.
    - The code moved unchanged apart from those hooks. It's marked `// @ts-nocheck`, and
      step 8 (strict TypeScript) types it.
  - **`data/supabase.ts`**: `getSupabase()` creates the client on first use, so importing the
    module does nothing.
  - **`data/auth.ts`**: `fetchAccount` (the `accounts` row), plus the copy kept on the phone
    for offline use (`storedAccount` / `storeAccount`). The sign-in screens stay for step 6.
  - **`src/test/fake-supabase.ts`** is an in-memory stand-in for the client calls sync makes.
    Tests can refuse a write (for RLS) or change data while an upload is on its way.
  - 11 sync tests:
    - **push:** a director's changes are uploaded and then marked as sent; a coach's or a
      local team's changes are never uploaded, and a coach's edit is replaced by the cloud
      version; deletions are sent as soft deletes; an edit made during an upload stays
      pending; a new team the server refuses becomes local again
    - **pull:** new and deleted rows arrive; rows that fail `checkIncoming` are left out and
      counted; a team the user was removed from leaves the phone
    - **sessions:** another person signing in clears the previous person's cloud teams;
      signing out during a sync drops what it downloaded; the first sync is reported (so the
      app can offer to upload the phone's teams)
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
- `keep-alive.yml` doesn't change. The database changes only in step 5.5, which adds checks on
  what can be stored; the tables and access rules stay the same.
- **Never trust data that comes in.** Row Level Security only controls _who_ can write: only
  a team's directors can write its players and games. It doesn't control _what_ they write.
  `games.data` is a `jsonb` document with no checks, so a director could skip the app, call
  the Supabase API directly and store anything in their own team. We don't move the game
  logic to the server: the server can't know the real match time, and minutes, score and
  clock are never stored, because each phone works them out from the events. The risk is
  broken or oversized data reaching other phones, so we check data at both ends: the app
  checks what it loads (step 5) and the database rejects what is obviously wrong (step 5.5).

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

Follow the layers in `docs/standards/code-organisation.md`. Step 5 is split into five PRs so
each one can be reviewed; the app works after each. Every PR follows the same method:

1. **First commit, the move.** Cut a section out of `src/main.js` into its module, with the
   code unchanged apart from `export`, and import it back.
2. **Then types and tests.**
   - Add types from `domain/types.ts`.
   - Where a function reads globals (`db`, `Date.now()`, the DOM), pass the value in as a
     parameter, and leave a thin wrapper in `main.js`.
   - Add Vitest tests next to the module, using the builders in `src/test/factories.ts`.
3. Run lint, `typecheck`, the tests and the build, then the Playwright flow (full game, PDF,
   stats, offline reload, EN/PT, both themes).

Code that hasn't moved yet stays in `src/main.js`, which imports the new modules.

#### 5.1 Shared basics and types

- `shared/i18n/i18n.ts`:
  - `I18N`, `t()`, `locale()`, `getLang()`/`setLang()`
  - typed so `pt` must have exactly the keys of `en`
- `shared/lib/format.ts`: `pad`, `fmtClock`, `fmtMins`, `mmss`, `isoDate`, `pct`.
- `shared/lib/dom.ts`: `$`, `$$`.
- `domain/types.ts`: the stored data shapes.
- `domain/formats.ts`: `FORMATS`, `FORMATIONS`, `formationsFor`.
- `src/test/factories.ts`.

#### 5.2 Game logic

- `domain/clock.ts`:
  - match time and the clock shown
  - period labels
  - end of period
  - reminders and auto-stop, as a decision `save()`/`render()` act on
  - the "forgot to press" fix
- `domain/pitch.ts`: slots, `fitLineup`, `startLineup`, `formationOf`.
- `domain/game-state.ts`: `derive`, `describe`, `timeOf`.
- `domain/titles.ts`: titles and score order.
- `domain/stats.ts`: season stats and the report table model.
- Tests:
  - the 2nd half starts at 20:00, and extra time shows as `20:00 (+02:00)`
  - times on a period boundary, and events logged during the break
  - auto-stop, and the "forgot to press" re-timing
  - minutes played, subs, goalkeeper changes, a red card
  - the score for home and away
  - formation slot moves
  - the August–July season and player totals

#### 5.3 Storage, change tracking and validation

- `data/store.ts`: `state` (`db`, `draft`, `renderPending`), `load`, `normalize`,
  `trackChanges`, `save`, `saveQuiet`, `syncGameTeams`. Shared values that change go into one
  exported `state` object, because code can't assign to a variable it imported.
- `data/persist.ts`: the persistent-storage request.
- `domain/validate.ts`:
  - type guards: `isTeam`, `isPlayer`, `isGame`
  - sanity checks: event times ≥ 0 and within the game's length plus the auto-stop limit;
    known event types and statuses; `playerId`s in the squad; text lengths within limits
  - used on everything that comes in: loading `localStorage`, backup import and cloud pulls
  - a bad record is skipped (kept aside, not lost) and the user is warned; it must never crash
    the app
  - first run it over data the app itself creates, so valid data is never rejected
- Tests:
  - change tracking: `dirty`, `updatedAt`, tombstones, and the raw save not counting as a change
  - `normalize` migrating old shapes
  - deliberately broken records being rejected

#### 5.4 Supabase client, sync and sign-in logic

- `data/supabase.ts`, `data/sync.ts` and `data/auth.ts`. The parts that aren't UI move; the
  screens stay for step 6.
- Sync tells the screen about changes through an `onChange` callback, never by importing
  upwards.
- Tests with a mocked Supabase client:
  - push sends dirty records and tombstones
  - pull merges with last write wins and rejects invalid rows
  - a sync that was in flight drops its results when the cloud data is removed

#### 5.5 Database checks on what is stored

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
