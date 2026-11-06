# Testing

## What gets tested how

| Kind       | Tool                                  | For                                                                                                             | Where                                         |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Unit       | Vitest                                | pure logic: clock, game state, pitch, stats, helpers, i18n parity, `save()` change tracking, storage migrations | next to the file: `<module>.test.ts`          |
| DOM        | Vitest + happy-dom                    | a screen's HTML for a given `state` (escaping, what is shown or hidden for read-only coaches)                   | next to the page or feature: `<name>.test.ts` |
| End to end | Playwright (Chromium, phone viewport) | real user flows in the built app, offline reload                                                                | `e2e/*.spec.ts`                               |
| Database   | pgTAP (existing)                      | RLS policies                                                                                                    | `supabase/tests/`                             |

Most tests are unit tests. They're fast and cover the parts that are easy to get wrong
(minutes played, extra time, events logged during a break). Keep end-to-end tests to a few
key flows.

## Rules

- **Fixing a bug means adding a test** that fails before the fix.
- **New pure logic comes with tests** in the same PR. A UI change comes with a test when it
  changes behaviour, not just layout.
- **Tests describe behaviour**, readable as a sentence:
  `describe('clock') › it('shows the 2nd half from 20:00 even if the 1st ran to 22:00')`.
- **Arrange, act, assert.** Each test sets up its own data with the builders in
  `src/test/factories.ts` (`makeGame({ periods: 2, periodMin: 20 })`, `goal(p, '12:30')`). Don't
  use shared mutable fixtures, and don't make tests depend on each other's order.
- **Don't rely on real time or randomness.** Pass `now` into pure functions. Use
  `vi.useFakeTimers()` / `vi.setSystemTime()` for code that reads the clock, and stub
  `crypto.randomUUID` when an id matters.
- **Test the module's public functions, not its internals.** Mock only the boundaries:
  `localStorage` (happy-dom provides one; clear it in `beforeEach`), the Supabase client and
  `fetch`.
- Use test data that's clearly fake ("Player 7", "Test FC"). Never use real children's
  names.
- Don't use `test.only` or `test.skip` in committed code. oxlint's vitest plugin reports
  them, and the `test` job fails on `.only`.
- Coverage (`vitest --coverage`) is a guide, not a target. Aim for high coverage of
  `clock`, `game-state`, `pitch`, `stats` and `storage`.

## Playwright

- Follow [Playwright best practices](https://playwright.dev/docs/best-practices). Find
  elements by role and visible name (`getByRole('button', { name: 'Goal' })`), not by CSS
  class. Rely on web-first assertions (`await expect(…).toBeVisible()`), and never use
  fixed `waitForTimeout`.
- Each test starts with empty storage, or with a known `fut-academy-stats.v1` loaded
  through `page.addInitScript`.
- Run the tests at a phone viewport (`devices['iPhone 13']` or a 390×844 viewport) against
  `vite preview` (the built app). Run a theme- or language-sensitive flow once in each
  theme or language.
- Use the clock control (`page.clock`) to move match time forward instead of waiting.
- The end-to-end tests never call the real Supabase project: stub it with
  `page.route('https://*.supabase.co/**', …)` (see `e2e/signin.spec.ts`).
- On failure, CI keeps the screenshots and the trace.

## Running

```
npm test              # unit tests once
npx vitest            # watch mode while working
npm run e2e           # end to end (builds, then runs against vite preview)
npx playwright test e2e/game.spec.ts   # one file (after npm run build)
```

Before pushing, run `npm run lint && npm run typecheck && npm test`. CI runs the same
commands.
