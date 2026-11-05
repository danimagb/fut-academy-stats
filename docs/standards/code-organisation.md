# Frontend code organisation

How the code in `src/` is split into folders and modules, and which code may use which.
This structure is our own simplified version of two well-known approaches:

- **[Feature-Sliced Design](https://feature-sliced.design/docs/reference/layers)** (FSD): the
  code is split into stacked **layers**, and a module only imports from layers **below**
  its own.
- **[Bulletproof React](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)**:
  most code lives in **features**, features don't import each other, the app puts them
  together, and files are imported directly (no barrel `index.ts` files, which hurt Vite's
  tree-shaking).

These approaches don't depend on a framework. The same structure works now, with screens
that build HTML strings, and later with Vue: only `pages/` and the UI parts of `features/`
change. `domain/`, `data/` and `shared/` stay as they are.

## Layers
From top to bottom. **A module may import only from layers below its own.** Inside a layer,
see "Slices" below.

| Layer | What goes in it | Example (this app) |
|---|---|---|
| `app/` | Startup and wiring. The only code that runs when it's imported. | `main.ts` (boot, timers, wake lock), `router.ts` (route → page, tab bar), `actions.ts` (the one `data-action` listener), `pwa.ts`, `styles.css` (imports the base styles) |
| `pages/` | One folder per screen (route). A page arranges the features and domain data for that screen. | `games`, `teams`, `team`, `game-edit`, `game`, `report`, `stats`, `player`, `profile`, `admin` |
| `features/` | Something the user does, used on one or more pages. Holds its UI (HTML, handlers, sheets) and the logic it needs. | `substitution`, `log-event` (goal, cards, to goal), `fix-times`, `formation-picker`, `undo`, `sign-in`, `team-people` (directors, coaches, invites), `backup` (export/import), `share-pdf`, `language-switch`, `theme-switch` |
| `data/` | Where data is stored and how it is loaded and saved. No HTML. | `store.ts` (`state`, `save()`, change tracking, migrations), `supabase.ts` (client), `sync.ts` (sync engine), `persist.ts` (persistent storage request) |
| `domain/` | **Pure** app logic and types: data in, data out. No DOM, no storage, no network, no `Date.now()`. | `types.ts`, `clock.ts`, `game-state.ts`, `pitch.ts` (formations, slots, lineups), `stats.ts`, `report.ts` (report table model), `formats.ts` (age groups and their presets), `titles.ts` (team/match titles and score order) |
| `shared/` | Building blocks that know nothing about football. They could be reused in another app. | `lib/` (`esc`, `pad`, `$`/`$$`, date formatting), `ui/` (sheet, `confirmSheet`, `alertSheet`, toast, icons), `i18n/` (`I18N`, `t()`, `locale()`), `styles/` (variables, both themes, base, layout), `config.ts` |

What each layer may import:
```
app       → pages, features, data, domain, shared
pages     → features, data, domain, shared
features  → data, domain, shared
data      → domain, shared
domain    → shared/lib only (and other domain modules)
shared    → shared only
```
- **`domain/` matters most.** It's where minutes, scores and clock times are calculated,
  everything that has to come out the same on the game screen, in the report, in the PDF
  and in stats. Because it is pure, it's easy to test, and it can be reused unchanged when
  we move to Vue.
- **Never import upwards.** If lower code needs to tell higher code something (for
  example, sync has new data and the screen must re-render), it takes a callback or emits
  an event: `onChange(render)` is wired up in `app/main.ts`.
- **No import cycles**, in any layer.

## Slices (folders inside a layer)
- In `pages/` and `features/`, each folder is a **slice**. A slice **doesn't import from
  another slice in the same layer**: one feature doesn't import another feature, and one page
  doesn't import another page.
  - If two pages need the same piece of UI, it's a feature.
  - If two features need the same logic, it belongs in `domain/`, `data/` or `shared/`.
  - The page that uses two features connects them.
- `domain/`, `data/` and `shared/` are folders of modules, not slices. Their modules may
  import each other, as long as that creates no cycles.
- A slice keeps all of its files together:
  ```
  features/substitution/
    substitution.ts         HTML + handlers (registers 'substitution.*' actions)
    substitution.css        its styles, imported by substitution.ts
    bench-order.ts          logic used only here (pure)
    bench-order.test.ts     its tests, next to the file
  ```
- Start with one file per slice. Split it up when it grows past about 300–400 lines or
  covers two different things.
- Files are named after what they contain (`game-state.ts`, `bench-order.ts`), never
  `utils.ts`, `misc.ts` or `helpers.ts`. A file with no clear name means the code is in the
  wrong place.

## Pages and features in practice
- A page is a function `renderGamePage(id: string): void`. It reads `state`, gets what it
  shows from `domain/` (`deriveState(game, now)`), builds HTML from feature pieces
  (`substitutionSheetHtml(…)`, `logEventButtonsHtml(…)`) and writes it to `#main`.
- A feature exports:
  - functions that return HTML, ending in `Html`;
  - `register…Actions()`, which `app/actions.ts` calls to register its `data-action`
    handlers named `'<feature>.<verb>'`.
  
  Handlers change `state`, call `save()` and then `render()`.
- **Pages and features never do calculations themselves.** If code works out a number, a
  time or an order, it belongs in `domain/` and has a test.
- When we move to Vue, a page becomes a route component and a feature becomes a component
  (or a composable). `domain/` and `data/` don't change.

## State
- There is one app state, `state`, in `data/store.ts` (`state.db`, `state.draft`, …). Only
  `data/` writes to `localStorage`.
- To change data: edit `state.db`, then call `save()`. Never write to `localStorage`
  directly from a page or feature.
- Settings that belong to one phone (language, theme, filters) are read and written through
  small get/set functions in the module that owns them (`shared/i18n`, `features/theme-switch`).
- Don't add globals on `window`. Only `app/` uses `window`, `document` and `navigator` at
  startup.

## How this is checked
- **oxlint** (`.oxlintrc.json`):
  - `import/no-cycle`
  - `import/no-default-export` (config files such as `vite.config.ts` are exempt)
  - `no-restricted-imports`, set per layer with `overrides`:
    - a module can't import from a higher layer (for example `domain/**` can't import
      `@/data/**`, `@/features/**`, `@/pages/**` or `@/app/**`)
    - a feature can't import another feature (`@/features/**`), and a page can't import
      another page
- **How imports are written:**
  - **Between folders, use `@/`** (for example `import { esc } from '@/shared/lib/html'`).
  - **Inside a folder or slice, use `./`.**
  - `../` isn't allowed in `shared`, `domain`, `data`, `features` or `pages`, because a
    relative path could get around the layer rules.
  - So keep a slice one level deep: `features/substitution/*.ts`, with no subfolders.
- These rules are tested: an import from a higher layer, a feature importing another
  feature, and a `../` import out of a slice each fail the lint.
- Reviewers check whatever the tools can't, using the checklist in `git-and-prs.md`.

## Where things go
| You're adding… | Put it in |
|---|---|
| A new screen | `pages/<name>/`, plus a route in `app/router.ts` |
| A button, sheet or action used on a screen | `features/<name>/` |
| A calculation (minutes, order, totals, time) | `domain/` + a test next to it |
| A new field on a team, player or game | `domain/types.ts` + a migration in `data/store.ts` |
| Anything that talks to Supabase | `data/` |
| A generic helper or UI building block (no football in it) | `shared/lib` or `shared/ui` |
| Text users see | `shared/i18n` (`en` + `pt`) |
| A colour | `shared/styles/variables.css` (dark + light) |
