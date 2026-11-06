# Git, PRs and CI

## Branches

- `main` is what's live. Only merge into it from a PR with all checks passing.
- Bigger pieces of work get a **feature branch** (`feature/cloud-sync`, `feature/typescript`)
  with a plan in `docs/<name>-plan.md`. Each step is a PR into that branch, and the
  feature branch is merged into `main` when it works from end to end.
- Name working branches `<who>/<short-topic>` (for example `claude/…`, `daniel/fix-clock`).
  Delete them once merged.
- Never force-push `main` or a feature branch. A force-push with lease to your own working
  branch is fine.

## Commits

Follow the style already in the history: **`Area: what changed, in plain words`**, in the
imperative or as a description of the result, with no full stop.

```
Game screen: player tokens show minutes in a pill under the shirt
Stats: Y axis and gridlines on the in-app minutes chart
TypeScript 3/10: Supabase and config as modules
```

- `Area` is a screen (`Game screen`, `Team screen`, `Stats`, `Profile`) or a part of the app
  (`Sync`, `Storage`, `CI`, `Docs`). Steps of a feature plan use
  `<Feature> <n>/<total>: …`.
- The body (optional) explains **why**, and anything a reviewer should test by hand.
- Each commit does one thing. Formatting or renaming many files goes in its own commit, so
  it doesn't hide the real change.
- Never commit secrets, `dist/`, `node_modules/` or real personal data.

## Pull requests

- **Keep them small**: one plan step or one feature or fix. If the description needs "and
  also", split it.
- Title: same style as commits. Description:
  - **What** changed and **why** (link the plan step or issue).
  - **How it was tested**: the automated tests, plus the manual check at phone size in both
    themes for anything visual. Add a screenshot of anything visual.
  - **Notes**: follow-ups and known limitations, and any manual step for the repo owner
    (settings, Supabase).
- A PR that is a step of a feature plan **updates the plan's "Progress" section**.
- Update the docs in the same PR as the change: `README.md` for anything users see,
  `CLAUDE.md` and `docs/standards/` for conventions.

## Checklist (reviewer and author)

- [ ] CI passes: lint, typecheck, unit tests, build (and end to end from step 7).
- [ ] New logic has tests; a bug fix has a test that failed before the fix.
- [ ] Every new string is in `I18N` in `en` and `pt`.
- [ ] Every new colour has a dark and a light value; checked in both themes at phone size.
- [ ] Data in HTML is escaped; no inline handlers.
- [ ] The stored data shape is unchanged, or there's a migration with a test.
- [ ] Works offline and without an account.
- [ ] No secrets or personal data.

## CI

| Job         | Command                                            | Required         |
| ----------- | -------------------------------------------------- | ---------------- |
| `lint`      | `npm run lint` (oxlint) and `npm run format:check` | yes              |
| `typecheck` | `npm run typecheck`                                | yes              |
| `test`      | `npm test`                                         | yes              |
| `build`     | `npm run build`                                    | yes              |
| `e2e`       | `npm run e2e`                                      | yes, from step 7 |

Never skip, disable or loosen a check to get a PR green. Fix the cause, or change the rule on
purpose in its own PR (see `README.md` → "Changing a rule").
