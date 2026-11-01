# Fut Academy Stats

A phone web app for running youth football games: lineups, live substitutions, goals, cards and minutes played, with a report at full time.

It's plain HTML/CSS/JS with no build step and no server code. Data is saved on the phone (browser `localStorage`). Once opened over HTTPS it can be added to the home screen and works offline.

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
5. **Language**: EN | PT switch at the bottom of the home screen (Portuguese is the default on phones set to Portuguese). The PDF follows the app language.
6. **Backup**: Export/Import on the home screen, since data lives only on that phone.

### Game clock and extra time

Each half starts at its regular time, whatever happened before: with 2 × 20 min, the 2nd half starts at 20:00 even if the 1st half ran to 22:00. Anything that happens in extra time is shown as the regular end plus the extra, e.g. a sub at 22:00 of the 1st half shows as `20:00 (+02:00)`. Minutes played always count the real time on the pitch, extra time included.

### Half-time and forgetting to press the button

You end each half yourself with **End 1st half** and then **Start 2nd half**. Safety nets:

- When regular time is reached the phone vibrates and a reminder appears with an "End half" shortcut. It repeats every 2 minutes, and the clock shows the extra time, e.g. `20:00 (+01:30)`.
- If a half runs past its regular time by the **auto-stop limit** (default 10 min), the app stops it automatically, even if the app was closed.
- **⏱ Fix times** lets you say when the half really ended (regular, +1, +2, +3, +5, now or a custom value) and whether the next half has already started ("started 5 min ago"). The clock and any subs, goals or cards logged in the meantime are re-timed using the real time they were recorded. It also works after full time if you ended the game late.

## Running it

### On your computer (to try it)

```bash
cd fut_academy_stats
python3 -m http.server 8765
```

Open http://localhost:8765 in Chrome. Press F12 and toggle the device toolbar for a phone-sized view.

### On your phone

The phone needs the app served over **HTTPS** to install it and use it offline. The easiest free option is GitHub Pages:

1. Create a GitHub repo and push these files.
2. Repo **Settings → Pages → Deploy from branch → `main` / root**.
3. Open `https://<your-user>.github.io/<repo>/` on the phone, then:
   - Android/Chrome: menu ⋮ → **Add to Home screen**
   - iPhone/Safari: Share → **Add to Home Screen**

When you change the code, bump `CACHE` in `sw.js` so phones pick up the new version.

## Files

- `index.html`: app shell
- `app.js`: all logic: storage, views, clock, events, report
- `styles.css`: mobile-first dark theme
- `sw.js`, `manifest.webmanifest`, `icons/`: offline + install support
