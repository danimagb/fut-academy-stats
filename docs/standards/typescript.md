# TypeScript

## Compiler
- The goal is `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch` and `exactOptionalPropertyTypes`. Until step 8 the config is
  looser, but **new code is written as if strict were already on**.
- Target modern browsers (`ES2022`). Don't add polyfills: the app is for current phone
  browsers.

## Types
- **No `any`.** If a value's type is really unknown (JSON from `localStorage`, a Supabase row,
  an imported backup), use `unknown` and narrow it with a type guard (`isGame(x): x is Game`)
  where the data comes in. Code past that point trusts the types.
- **Don't use `as` to silence errors.** `as const` is fine, and so is a cast right after a
  check the compiler can't follow, with a comment saying why. Avoid non-null `!`: handle `null`.
- **Data shapes live in `src/domain/types.ts`**: `Team`, `Player`, `Game`, `GameEvent`, `Db` and
  so on. Never redeclare them locally. A type used only inside one module stays in that
  module.
- **`type` vs `interface`:** use `type`, for consistency. Use `interface` only for a shape
  meant to be extended.
- **Use string literal unions, not `enum`:** `type Lang = 'en' | 'pt'`. For lookup tables,
  use `as const` objects with `keyof typeof`. Unions don't exist at runtime and work well
  with JSON.
- **Events are a discriminated union** on `type`: `{ type: 'goal'; playerId: string; t: number } | …`.
  Handle them with `switch (e.type)`, and add an `assertNever(e)` in `default` so that adding
  a new event type shows every place that needs updating.
- **Name the units in time values:** `t` is match time in ms, `at` is wall-clock ms
  (`Date.now()`). If a value could be read as seconds or minutes, put the unit in its name
  (`limitMin`, `durationMs`).
- Mark data you don't change as `readonly` (`readonly string[]`, `Readonly<Game>`). For
  example, `deriveState(game)` must not modify `game`.
- Write return types on exported functions. Inside a function, let TypeScript infer the
  types.

## Naming
| What | Style | Example |
|---|---|---|
| Variables, functions | `camelCase` | `matchTitle`, `fmtClock` |
| Types | `PascalCase` | `GameEvent`, `SyncState` |
| Top-level constants that never change | `UPPER_SNAKE_CASE` | `STORE_KEY`, `PUSH_BATCH` |
| Files | `kebab-case.ts` | `game-state.ts`, `pages/player/player.ts` |
| Booleans | `is`/`has`/`can` | `isLive`, `canEdit` |
| Screens | `view` + screen name | `viewGame`, `viewStats` |

- Use whole words for names, except abbreviations the code already uses throughout: `db`,
  `g` (game), `p` (player), `t` (match time), `esc`, `fmt*`. Single letters are fine for short
  callbacks (`(g) => g.id === id`) and nowhere else.
- Name a function for what it gives back or does (`getTeam`, `endPeriod`), not how it works.

## Functions and values
- **`const` by default**; use `let` only when the value is reassigned, and never `var`.
  Always use `===` (except `x == null`, which checks for both `null` and `undefined`).
- **Keep calculations separate from side effects.** The clock, game state, stats and lineup
  code are **pure functions**: data in, data out, with no access to `db`, the DOM or
  `Date.now()` (the time is passed in). That makes them easy to test, and they can be
  reused as-is when we move to Vue.
- Top-level functions use `function` declarations, so they're named and can be defined
  anywhere in the file. Callbacks and small one-liners use arrow functions.
- Pass an options object instead of more than about three positional arguments, and instead
  of a boolean argument that's unclear at the call site (`fmtTime(t, { atStart: true })`, not
  `fmtTime(t, true)`).
- Return early instead of nesting `if`s. Use optional chaining (`?.`) and `??` over chains
  of `&&` and `||` (`||` also treats `0` and `''` as missing).
- Use `async`/`await`, not `.then()` chains. Don't leave a promise unhandled: either
  `await` it, or mark it `void promise` on purpose and handle its errors inside.

## Errors
- **Expected problems** (offline, a session that's run out, a bad backup file) aren't
  exceptions. Show a message to the user (`toast` or an alert) and keep the app working.
  The app must keep working offline and without an account.
- Only throw for bugs: an impossible state, or a broken assumption.
- Never catch an error and do nothing with it. At least log it (`console.warn`) with
  context, or comment why it's safe to ignore.
- Wrap every `localStorage` call in try/catch, because private mode or a full disk can
  make it throw (see `data-and-sync.md`).

## Comments
- **Explain why, not what.** Follow how `app.js` is written today: a short paragraph above
  any logic that isn't obvious (period boundaries, events logged during the break, sync
  conflicts).
- Give every exported function a one-line `/** … */` description, which the editor shows on
  hover. Use `@param` only when a parameter's name and type don't make it obvious.
- Use `// TODO(step N): …` only for something a planned step will fix. Anything else goes
  in an issue.
- Comments are in English. User-facing text never goes in comments or code; it goes in
  `I18N` (see `ui.md`).

## Imports and exports
- Use **named exports only**, with no `export default`. That keeps the same name
  everywhere and makes finding usages and renaming reliable.
- Order imports: packages, then `@/` modules (lowest layer first: `shared`, `domain`, `data`, …), then files from the same folder (`./`). Use `import type { … }`
  for imports that are only types.
- Don't use barrel files (`index.ts` that only re-exports): they hide the real
  dependencies and can cause import cycles.
- No import cycles (see `code-organisation.md`).
