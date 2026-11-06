# Fut Academy Stats

A phone web app for running youth football games: lineups, live substitutions, goals, cards and minutes played, with a report at full time.

It's a TypeScript web app (built with Vite) with no server of its own. Data is saved on the phone (browser `localStorage`); signing in adds optional, invite-only [cloud sync](#cloud-sync-optional). Once opened over HTTPS it can be added to the home screen and works offline.

## Using it

1. **Teams**: create your team once (club name, e.g. "Padroense F.C.", and team name, e.g. "Sub-7B") and add its players: shirt number, shirt name (shown on the game screen) and full name (used in the report/PDF; optional).
2. **New game**: team, opponent, home/away, round (jornada), date/time, age group. The last team used is preselected.
   - U7 = 1 GK + 3 and U8 = 1 GK + 4; every preset can be changed.
   - Set the number of periods, minutes per period, and the auto-stop limit (see below).
   - Mark each player as Out / Bench / Start and tap 🧤 for the goalkeeper.
3. **Live game**:
   - **Tap a player**: the sheet shows the substitution list straight away, plus big ⚽ Goal / 🟨 / 🟥 / 🧤 To goal buttons.
     - Tapping a pitch player lists the bench, with fewest minutes played first.
     - Tapping a bench player lists the pitch, with most minutes played first.
   - **Hold and drag** a player onto one in the other group to substitute in one move.
   - **Pitch view**: players on the pitch are shown in formation (GK at the bottom). Tap **⚙ formation** to pick another preset for your team size (e.g. 2-1, 1-2-1, 2-3-1, 3-3-2, 4-4-2). A sub takes the position of the player going off; drag one pitch player onto another (or onto an empty spot after a red card) to swap positions, and drag onto the goal to change the GK. Before kick-off this just edits the starting lineup.
   - Every action shows a toast with **Undo**. There's also an "Undo" button above the timeline.
   - A red card takes the player off; they can't come back and the team plays one short. If the GK is sent off, tap another player and choose 🧤 To goal.
   - The screen stays on while the game is live, where the browser supports it.
4. **Report**: a preview of the PDF stats sheet (club, team, season, game, round; per player: starter/sub, stints entered–left on the game clock, minutes, goals, cards). **Share PDF** sends the file to WhatsApp and similar apps, or downloads it where sharing isn't available.
5. **Stats** (bottom tab): per-player numbers for a season, from the team's finished games. Pick
   the team and the season (August to July). The table shows, for each player, games played out
   of the team's games, minutes, goals and cards. Tap a player to open their sheet: called up %,
   games, starts, minutes, goals, cards, a bar chart of minutes in each game and the list of games
   (tap one for its report). **Share PDF** sends the sheet as a one-page PDF, ready to send to the
   family.
6. **Profile** (bottom tab) holds your account and the app settings:
   - **Account** (optional): sign in to sync teams to the cloud. See [Cloud sync](#cloud-sync-optional).
   - **Language**: English | Português (Portuguese is the default on phones set to Portuguese). The PDF follows the app language.
   - **Theme**: ☀️ Light | 🌙 Dark | Auto. Light has stronger contrast and is easier to read outdoors in sunlight; Auto follows the phone's setting (the default).
   - **Backup**: Export/Import, since teams that aren't synced live only on that phone. Once there is data, the app asks the browser to keep it stored (persistent storage), so it isn't cleared on its own; Profile shows whether the browser agreed.

### Game clock and extra time

Each half starts at its regular time, whatever happened before: with 2 × 20 min, the 2nd half starts at 20:00 even if the 1st half ran to 22:00. Anything that happens in extra time is shown as the regular end plus the extra, e.g. a sub at 22:00 of the 1st half shows as `20:00 (+02:00)`. Minutes played always count the real time on the pitch, extra time included.

### Half-time and forgetting to press the button

You end each half yourself with **End 1st half** and then **Start 2nd half**. Safety nets:

- When regular time is reached the phone vibrates and a reminder appears with an "End half" shortcut. It repeats every 2 minutes, and the clock shows the extra time, e.g. `20:00 (+01:30)`.
- If a half runs past its regular time by the **auto-stop limit** (default 10 min), the app stops it automatically, even if the app was closed.
- **⏱ Fix times** lets you say when the half really ended (regular, +1, +2, +3, +5, now or a custom value) and whether the next half has already started ("started 5 min ago"). The clock and any subs, goals or cards logged in the meantime are re-timed using the real time they were recorded. It also works after full time if you ended the game late.

## Cloud sync (optional)

Without an account the app works exactly as above, with everything on the phone. Signing in
adds cloud sync through [Supabase](https://supabase.com) (EU region), so a team survives losing
the phone and can be shared with other coaches.

- **Invite-only.** Nobody can create an account. The **admin** gives people access on the
  in-app **Admin** page (the _Admin_ tab, only visible to the admin), as a **director** or
  **coach** account.
  Profile → Account has two tabs. **Activate account** (first time): the email the admin
  registered → a code sent to that email → choose a password. **Sign in**: email + password
  (the app keeps you signed in). _Forgot your password?_ uses the same code steps.
  Passwords are stored by Supabase Auth only as bcrypt hashes.
- **Synced or local.** Every team is either _Synced_ or _Local_. Director
  accounts can upload a team (or create new teams as synced); coach accounts keep their own
  teams on the phone.
- **Roles in a synced team.** _Directors_ can do everything and add or remove coaches (Staff section
  on the team screen, by email, only people who already have access). _Coaches_ are
  read-only: they see the team, games and reports and can share the PDF, but can't change
  anything.
- **Local first.** The app saves on the phone first and syncs in the background (on start, a
  few seconds after a change, when the signal comes back, every minute, or with _Sync now_).
  Offline at the pitch, changes simply wait. Two phones logging the _same live game_ at the
  same time isn't supported: the last one to sync wins.
- **Signing out** removes the synced teams from that phone (they stay in the cloud); teams that
  were only on the phone stay.
- **Your data**: Profile → Account → _How your data is handled_.

Setting it up (once, by the maintainer) is described in
[`docs/supabase-setup.md`](docs/supabase-setup.md); how it's built is in
[`docs/cloud-sync-plan.md`](docs/cloud-sync-plan.md) and [`supabase/README.md`](supabase/README.md).
The `Supabase keep-alive` GitHub Action pings the project every 2 days so the free tier
doesn't pause; if it fails, GitHub emails the repository owner.

## Running it

### On your computer

It's a TypeScript app built with [Vite](https://vite.dev). You need Node 22 (see `.nvmrc`).

```bash
npm ci          # install the exact dependency versions
npm run dev     # local server with live reload
```

Open the address it prints in Chrome. Press F12 and toggle the device toolbar for a phone-sized view.

Before sending a change, run the same checks as CI:

```bash
npm run lint && npm run typecheck && npm test && npm run format:check
npm run e2e     # builds the app and runs the end-to-end tests (Playwright)
```

### On your phone

The phone needs the app served over **HTTPS** to install it and use it offline. It's published with GitHub Pages:

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions** (once).
2. Every push to `main` builds the app and publishes it (`.github/workflows/deploy.yml`).
3. Open `https://<your-user>.github.io/<repo>/` on the phone, then:
   - Android/Chrome: menu ⋮ → **Add to Home screen**
   - iPhone/Safari: Share → **Add to Home Screen**

Installed apps update on their own: each build gives the service worker a new list of files.

## Files

- `index.html`: app shell; `src/app/main.ts` starts the app
- `src/`: the app, in layers (see `docs/standards/code-organisation.md`)
  - `app/`: startup and wiring (router, the action listener, tab bar, styles list)
  - `pages/`: one folder per screen (games, teams, team, game-edit, game, report, stats, profile, admin)
  - `features/`: things screens share (sign-in, team people, PDF, live-game actions, …)
  - `data/`: the store, saving, sync with Supabase, queries
  - `domain/`: the game rules and numbers (clock, minutes, lineups, stats, validation), with unit tests
  - `shared/`: building blocks (translations, HTML escaping, sheets, dialogs, base styles)
  - `sw.ts`: the service worker (offline + install)
- `public/`: icons, manifest
- `e2e/`: end-to-end tests (Playwright)
- `supabase/`: database migrations, Row Level Security tests, the `admin` Edge Function
- `docs/`: Supabase setup guide, the cloud sync plan, the TypeScript plan and the code standards
- `.github/workflows/`: CI checks, deploy to Pages, and the Supabase keep-alive
