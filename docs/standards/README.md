# Code standards

These are the rules for code in this repo, so that it reads the same whoever wrote it, a person or a Claude
session. They apply to the TypeScript + Vite app being built on `feature/typescript`
(see `../typescript-plan.md`).

| File                                         | Covers                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [typescript.md](typescript.md)               | Language rules: types, naming, functions, errors, comments                                                                        |
| [code-organisation.md](code-organisation.md) | **Frontend structure**: layers (`app` → `pages` → `features` → `data` → `domain` → `shared`), slices, what may import what, state |
| [ui.md](ui.md)                               | HTML strings and escaping, events, CSS and themes, I18N, accessibility, phone first                                               |
| [data-and-sync.md](data-and-sync.md)         | `db`, `save()`, record shapes, storage keys, Supabase                                                                             |
| [testing.md](testing.md)                     | Vitest unit tests and Playwright end-to-end tests                                                                                 |
| [git-and-prs.md](git-and-prs.md)             | Branches, commit messages, PRs, CI                                                                                                |

## Rule zero: tools enforce, documents explain

If a rule can be checked by a tool, the tool checks it in CI. These documents cover only what a
tool can't check, and the reasons behind the rules.

| Tool                            | Enforces                                                                                                   | Config                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Formatter (Prettier; see below) | Layout: indentation, quotes, semicolons, line width                                                        | `.prettierrc.json`, `.editorconfig`      |
| oxlint                          | Bugs and risky patterns, unused code, `==`, import cycles and the layer rules, TypeScript and Vitest rules | `.oxlintrc.json`                         |
| `tsc --noEmit`                  | Types (`strict` from step 8)                                                                               | `tsconfig.json`                          |
| Vitest / Playwright             | Behaviour                                                                                                  | `vite.config.ts`, `playwright.config.ts` |

**Formatter.** These settings match how the code is written today:

| Setting         | Value                   |
| --------------- | ----------------------- |
| Indentation     | 2 spaces                |
| Quotes          | Single quotes           |
| Semicolons      | Yes                     |
| Trailing commas | `all`                   |
| Line width      | 110 (`printWidth: 110`) |
| Line endings    | LF                      |

We start with **Prettier** because it's stable. [Oxfmt](https://oxc.rs/blog/2026-02-24-oxfmt-beta)
(from the oxlint team) is faster and passes Prettier's JS/TS conformance tests, but it's still in
beta. Switch once it reaches 1.0; with the same settings, the change should barely alter any files.

## Where these rules come from

They come from this repo first, then from well-known references, adapted to a small, phone-first
app with no framework:

- **This repo:**
  - the conventions in `CLAUDE.md` and `docs/cloud-sync-plan.md`
  - how `app.js` is already written: comments that explain _why_, small helpers, data-first
    design (state is derived from events)
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)** and the
  [`strict`](https://www.typescriptlang.org/tsconfig/#strict) compiler options
- **[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)**: naming,
  `import`/`export`, `type` vs `interface`, avoiding `any`
- **[oxlint rules](https://oxc.rs/docs/guide/usage/linter/rules.html)** (ports of the ESLint,
  typescript-eslint, unicorn and vitest rules) and its
  [config reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.md)
- **[Vitest guide](https://vitest.dev/guide/)** and
  [Playwright best practices](https://playwright.dev/docs/best-practices)
- **[OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)**,
  because screens are built from HTML strings
- **[web.dev PWA](https://web.dev/explore/progressive-web-apps)** and
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (tap targets, contrast)
- **[Feature-Sliced Design](https://feature-sliced.design/docs/reference/layers)** and
  **[Bulletproof React's project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)**:
  layers, feature folders, and imports that only go one way. They're the basis for
  `code-organisation.md`.
- **[Vue style guide](https://vuejs.org/style-guide/)**, only once we move to Vue. The module
  rules here are meant to make that move easy.

## Changing a rule

Change the document and the tool config in the same PR, and explain why in the PR description.
When the formatter or linter config changes, re-format or fix the whole codebase in that PR, so
`main` never has files that break the current rules.
