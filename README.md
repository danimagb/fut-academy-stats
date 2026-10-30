# Fut Academy Stats

A phone web app for running youth football games: lineups, live substitutions, goals, cards and minutes played, with a report at full time.

It's plain HTML/CSS/JS with no build step and no server code. Data is saved on the phone (browser `localStorage`). Once opened over HTTPS it can be added to the home screen and works offline.

## Using it

1. **Players**: add your squad once (shirt number + name).
2. **New game**: opponent, date/time, age group.
   - U7 = 1 GK + 3 and U8 = 1 GK + 4; every preset can be changed.
   - Set the number of periods, minutes per period, and the auto-stop limit (see below).
   - Mark each player as Out / Bench / Start and tap 🧤 for the goalkeeper.
3. **Live game**:
   - **Tap a player**: the sheet shows the substitution list straight away, plus big ⚽ Goal / 🟨 / 🟥 / 🧤 To goal buttons.
     - Tapping a pitch player lists the bench, with fewest minutes played first.
     - Tapping a bench player lists the pitch, with most minutes played first.
   - **Hold and drag** a player onto one in the other group to substitute in one move.
   - Every action shows a toast with **Undo**. There's also an "Undo" button above the timeline.
   - A red card takes the player off; they can't come back and the team plays one short. If the GK is sent off, tap another player and choose 🧤 To goal.
   - The screen stays on while the game is live, where the browser supports it.
4. **Report**: each player's stints (entered–left, game clock), minutes played, goals and cards. **Share summary** sends text to WhatsApp and similar apps; **Download CSV** gives a spreadsheet.
5. **Backup**: Export/Import on the home screen, since data lives only on that phone.

### Half-time and forgetting to press the button

You end each half yourself with **End 1st half** and then **Start 2nd half**. Safety nets:

- When regular time is reached the phone vibrates and a reminder appears with an "End half" shortcut. It repeats every 2 minutes, and the clock shows the extra time, e.g. `21:30 (+1:30)`.
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
