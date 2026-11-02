# Notes for Claude sessions

Fut Academy Stats is a phone web app (PWA) for youth football games: plain HTML/CSS/JS with no
build step, hosted on GitHub Pages from `main`. See `README.md` for what it does.

## Work in progress: cloud sync

Cloud sync with Supabase (invite-only) is being built on the **`feature/cloud-sync`** branch,
in small PRs into that branch. **Read `docs/cloud-sync-plan.md` first**: its "Progress"
section says which step is done and what comes next. Every PR for this feature must update
that section.

## Conventions

- `app.js` holds all logic (storage, views, clock, events, report/PDF), `styles.css` all
  styles, `sw.js` the offline cache.
- **Bump `CACHE` in `sw.js`** with every change to the app's files, so installed apps update.
- Every user-facing string is in `I18N` in both `en` and `pt` (European Portuguese).
- Colours are CSS variables on `:root` with light-theme values under `[data-theme="light"]`;
  new colours need both.
- Data lives in `localStorage` (`fut-academy-stats.v1`). Edit `db`, then call `save()`;
  `save()` tracks changed and deleted records for sync.
- Check changes in a browser at phone size (Playwright with Chromium is available in cloud
  sessions), in both themes when the change is visual.
