'use strict';

// ---------- Config ----------

const STORE_KEY = 'fut-academy-stats.v1';

const FORMATS = [
  { id: 'U7', field: 3, periods: 2, periodMin: 20 },
  { id: 'U8', field: 4, periods: 2, periodMin: 20 },
  { id: 'U9', field: 6, periods: 2, periodMin: 25 },
  { id: 'U10', field: 6, periods: 2, periodMin: 25 },
  { id: 'U11', field: 8, periods: 2, periodMin: 30 },
  { id: 'U12', field: 8, periods: 2, periodMin: 30 },
  { id: 'U13+', field: 10, periods: 2, periodMin: 35 },
  { id: 'Custom', field: 4, periods: 2, periodMin: 20 },
];

const STATUS = { scheduled: 'Scheduled', live: 'Live', break: 'Break', finished: 'Finished' };

// ---------- Storage ----------

let db = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && Array.isArray(data.players) && Array.isArray(data.games)) return data;
  } catch {}
  return { players: [], games: [] };
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

// ---------- Helpers ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const main = $('#main');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

const fmtMins = (ms) => `${Math.floor(ms / 60000)}'`;

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(g) {
  const d = new Date(`${g.date}T${g.time || '00:00'}`);
  if (isNaN(d)) return g.date || '';
  return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const getGame = (id) => db.games.find((g) => g.id === id);

const byNumber = (a, b) =>
  (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999) || a.name.localeCompare(b.name);

function sortIds(g, ids) {
  return [...ids].sort((a, b) => byNumber(g.names[a], g.names[b]));
}

function pname(g, id) {
  const p = g.names[id];
  if (!p) return '?';
  return p.number ? `#${p.number} ${p.name}` : p.name;
}

function periodName(g, n) {
  if (g.periods === 2) return n === 1 ? '1st half' : '2nd half';
  if (g.periods === 4) return `Q${n}`;
  if (g.periods === 1) return 'Game';
  return `Period ${n}`;
}

// Optional button HTML (e.g. Undo) is shown next to the message.
function toast(msg, button = '') {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${button}`;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), button ? 6000 : 2200);
}

const undoBtn = (eventId) => `<button data-action="undo-toast" data-id="${eventId}">Undo</button>`;

const buzz = () => navigator.vibrate?.(35);

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Clock ----------

function matchTime(g) {
  const c = g.clock;
  return c.elapsedMs + (c.running ? Date.now() - c.startedAt : 0);
}

function startClock(g) {
  if (g.clock.running) return;
  g.clock.running = true;
  g.clock.startedAt = Date.now();
}

function stopClock(g) {
  if (!g.clock.running) return;
  g.clock.elapsedMs = matchTime(g);
  g.clock.running = false;
  g.clock.startedAt = null;
}

function periodStart(g) {
  const m = [...g.marks].reverse().find((x) => x.type === 'start');
  return m ? m.t : 0;
}

function periodLabel(g) {
  const c = g.clock;
  switch (g.status) {
    case 'scheduled': return `Not started · ${g.periods} × ${g.periodMin} min`;
    case 'live': {
      const pt = matchTime(g) - periodStart(g);
      const over = pt - g.periodMin * 60000;
      return `${periodName(g, c.period)} · ${fmtClock(pt)}${over > 0 ? ` (+${fmtClock(over)})` : ''}${c.running ? '' : ' (paused)'}`;
    }
    case 'break': return `Break after ${periodName(g, c.period)}`;
    default: return 'Full time';
  }
}

const maxExtraMs = (g) => (g.maxExtra ?? 10) * 60000;

// Ends the current period at match time endT (may be earlier than now).
// Events logged after endT happened during the break, so they move to endT.
function endPeriodAt(g, endT) {
  stopClock(g);
  g.clock.elapsedMs = endT;
  for (const e of g.events) if (e.t > endT) e.t = endT;
  g.marks.push({ type: 'end', period: g.clock.period, t: endT, wall: Date.now() });
  g.status = g.clock.period >= g.periods ? 'finished' : 'break';
}

// Reminders once regular time is up, and an automatic stop if the coach forgets.
function checkTime(g) {
  const p = g.clock.period;
  const pt = matchTime(g) - periodStart(g);
  const regular = g.periodMin * 60000;
  const onThisGame = route().view === 'game' && route().id === g.id;
  const last = p >= g.periods;

  if (pt >= regular + maxExtraMs(g)) {
    endPeriodAt(g, periodStart(g) + regular + maxExtraMs(g));
    g.autoStopped = p;
    save();
    navigator.vibrate?.([500, 200, 500]);
    if (onThisGame) {
      render();
      toast(`⏱ ${periodName(g, p)} auto-stopped at +${g.maxExtra ?? 10} min`, '<button data-action="fix-open">Fix times</button>');
    }
    return;
  }
  if (pt >= regular) {
    const n = Math.floor((pt - regular) / 120000); // remind every 2 minutes
    if ((g.alerted[p] ?? -1) >= n) return;
    g.alerted[p] = n;
    save();
    navigator.vibrate?.([300, 150, 300]);
    if (onThisGame) {
      const msg = n === 0 ? `⏰ ${periodName(g, p)}: time is up` : `⏰ ${periodName(g, p)}: +${Math.floor((pt - regular) / 60000)} min extra`;
      toast(msg, `<button data-action="end-period">${last ? 'Full time' : `End ${periodName(g, p)}`}</button>`);
    }
  }
}

// "I forgot to press the button": set when the period really ended and,
// optionally, how long ago the next one started. Event times are rebuilt from
// their real (wall-clock) timestamps.
function applyFix(g, endMin, startedMinAgo) {
  const p = g.clock.period;
  const last = p >= g.periods;
  const startIdx = g.marks.map((m) => m.type).lastIndexOf('start');
  const start = g.marks[startIdx]?.t ?? 0;
  const endT = start + Math.round(endMin * 60000);
  const resumeWall = startedMinAgo != null && !last ? Date.now() - Math.round(startedMinAgo * 60000) : null;

  for (const e of g.events) {
    if (e.t <= endT) continue;
    e.t = resumeWall != null && e.wall >= resumeWall ? endT + (e.wall - resumeWall) : endT;
  }
  g.marks = g.marks.slice(0, startIdx + 1);
  g.marks.push({ type: 'end', period: p, t: endT, wall: Date.now() });
  Object.assign(g.clock, { running: false, startedAt: null, elapsedMs: endT });
  g.autoStopped = null;

  if (resumeWall != null) {
    g.clock.period = p + 1;
    g.marks.push({ type: 'start', period: p + 1, t: endT, wall: resumeWall });
    Object.assign(g.clock, { running: true, startedAt: resumeWall });
    g.status = 'live';
    delete g.alerted[p + 1];
  } else {
    g.status = last ? 'finished' : 'break';
  }
  save();
}

// ---------- Game state (derived from events) ----------

function derive(g) {
  const on = new Set(g.starters);
  const sentOff = new Set();
  let gk = g.gkId;
  let us = 0;
  let them = 0;
  const stats = {};
  for (const id of g.squad) stats[id] = { intervals: [], open: null, goals: 0, yellow: 0, red: 0, redAt: null };
  for (const id of g.starters) stats[id].open = 0;

  const close = (s, t) => {
    if (s.open != null) s.intervals.push([s.open, t]);
    s.open = null;
  };

  for (const e of g.events) {
    const s = stats[e.playerId];
    switch (e.type) {
      case 'sub':
        on.delete(e.playerId);
        on.add(e.inId);
        close(s, e.t);
        stats[e.inId].open = e.t;
        if (gk === e.playerId) gk = e.inId;
        break;
      case 'goal': s.goals++; us++; break;
      case 'oppgoal': them++; break;
      case 'yellow': s.yellow++; break;
      case 'red':
        s.red++;
        s.redAt = e.t;
        sentOff.add(e.playerId);
        if (on.delete(e.playerId)) close(s, e.t);
        if (gk === e.playerId) gk = null;
        break;
      case 'gk': gk = e.playerId; break;
    }
  }

  const end = matchTime(g);
  for (const id of g.squad) {
    const s = stats[id];
    if (s.open != null) s.intervals.push([s.open, end]);
    s.intervals = s.intervals.filter(([a, b]) => b > a || g.status === 'scheduled');
    s.played = s.intervals.reduce((sum, [a, b]) => sum + (b - a), 0);
  }
  return { on, sentOff, gk, us, them, stats };
}

function addEvent(g, e) {
  const id = uid();
  g.events.push({ id, t: matchTime(g), wall: Date.now(), ...e });
  save();
  buzz();
  return id;
}

function doSub(g, out, inn) {
  const id = addEvent(g, { type: 'sub', playerId: out, inId: inn });
  render();
  toast(`🔁 ${g.names[inn].name} on, ${g.names[out].name} off`, undoBtn(id));
}

function describe(g, e) {
  switch (e.type) {
    case 'sub': return `🔁 ${esc(pname(g, e.inId))} on, ${esc(pname(g, e.playerId))} off`;
    case 'goal': return `⚽ Goal: ${esc(pname(g, e.playerId))}`;
    case 'oppgoal': return '🥅 Goal conceded';
    case 'yellow': return `🟨 Yellow: ${esc(pname(g, e.playerId))}`;
    case 'red': return `🟥 Red: ${esc(pname(g, e.playerId))}`;
    case 'gk': return `🧤 In goal: ${esc(pname(g, e.playerId))}`;
    case 'start': return `⏱ Start of ${periodName(g, e.period)}`;
    case 'end': return `⏱ End of ${periodName(g, e.period)}`;
  }
  return '';
}

// ---------- Routing ----------

let draft = null;

function route() {
  const [, view = 'games', id] = location.hash.split('/');
  return { view, id };
}

function render() {
  closeSheet();
  const { view, id } = route();
  const views = { games: viewGames, players: viewPlayers, new: viewEdit, edit: viewEdit, game: viewGame, report: viewReport };
  (views[view] || viewGames)(id);
  updateWakeLock();
}

window.addEventListener('hashchange', () => {
  draft = null;
  render();
  window.scrollTo(0, 0);
});

function bar(title, back) {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : ''}<h1>${title}</h1></header>`;
}

function notFound() {
  main.innerHTML = `${bar('Not found', '#/games')}<p class="empty">This game no longer exists.</p>`;
}

// ---------- Views: games list ----------

function viewGames() {
  const games = [...db.games].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  main.innerHTML = `
    ${bar('⚽ Fut Academy Stats')}
    <div class="row gap">
      <a class="btn primary grow" href="#/new">+ New game</a>
      <a class="btn" href="#/players">Players (${db.players.length})</a>
    </div>
    ${games.length
      ? `<ul class="list">${games.map(gameCard).join('')}</ul>`
      : '<p class="empty">No games yet.<br>Add your players, then create a game.</p>'}
    <div class="row gap foot">
      <button class="btn small ghost" data-action="backup">Export backup</button>
      <label class="btn small ghost">Import backup<input type="file" accept="application/json,.json" data-change="restore" hidden></label>
    </div>`;
}

function gameCard(g) {
  const d = derive(g);
  const href = g.status === 'finished' ? `#/report/${g.id}` : `#/game/${g.id}`;
  return `<li><a class="card" href="${href}">
    <div class="grow">
      <strong>vs ${esc(g.opponent || 'Opponent')}</strong>
      <div class="muted">${esc(fmtDate(g))} · ${esc(g.formatId)} · 1 GK + ${g.field}</div>
    </div>
    <div class="right">
      ${g.status !== 'scheduled' ? `<div class="score">${d.us}–${d.them}</div>` : ''}
      <span class="badge ${g.status}">${STATUS[g.status]}</span>
    </div>
  </a></li>`;
}

// ---------- Views: players (roster) ----------

function viewPlayers() {
  const ps = [...db.players].sort(byNumber);
  main.innerHTML = `
    ${bar('Players', '#/games')}
    <form class="row gap" data-form="add-player">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="Player name" required autocomplete="off">
      <button class="btn primary">Add</button>
    </form>
    ${ps.length ? `<ul class="list">${ps.map((p) => `
      <li class="item">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}</span>
        <button class="btn small ghost" data-action="edit-player" data-id="${p.id}">Edit</button>
        <button class="btn small ghost danger" data-action="delete-player" data-id="${p.id}" aria-label="Delete">✕</button>
      </li>`).join('')}</ul>` : '<p class="empty">No players yet. Add your squad above.</p>'}`;
}

// ---------- Views: new / edit game ----------

function newDraft(id) {
  const g = id && getGame(id);
  if (g) {
    return {
      id: g.id, date: g.date, time: g.time, opponent: g.opponent, formatId: g.formatId,
      field: g.field, periods: g.periods, periodMin: g.periodMin, maxExtra: g.maxExtra ?? 10, gkId: g.gkId,
      sel: Object.fromEntries(g.squad.map((p) => [p, g.starters.includes(p) ? 'start' : 'bench'])),
    };
  }
  const f = FORMATS[0];
  const now = new Date();
  return {
    date: isoDate(now), time: `${pad(now.getHours())}:00`, opponent: '', formatId: f.id,
    field: f.field, periods: f.periods, periodMin: f.periodMin, maxExtra: 10, gkId: null, sel: {},
  };
}

function squadCount() {
  const need = (parseInt(draft.field, 10) || 0) + 1;
  const vals = Object.values(draft.sel);
  const starters = vals.filter((v) => v === 'start').length;
  const bench = vals.filter((v) => v === 'bench').length;
  return `<span class="${starters === need ? 'ok' : 'warn'}">Starters ${starters}/${need}</span> · Bench ${bench}`;
}

function viewEdit(id) {
  if (!draft) draft = newDraft(id);
  const ps = [...db.players].sort(byNumber);
  const back = draft.id ? `#/game/${draft.id}` : '#/games';
  main.innerHTML = `
    ${bar(draft.id ? 'Edit game' : 'New game', back)}
    <div class="form">
      <label>Opponent<input data-field="opponent" value="${esc(draft.opponent)}" placeholder="e.g. Sporting U8" autocomplete="off"></label>
      <div class="row gap">
        <label class="grow">Date<input type="date" data-field="date" value="${esc(draft.date)}"></label>
        <label class="grow">Time<input type="time" data-field="time" value="${esc(draft.time)}"></label>
      </div>
      <label>Age group / format
        <select data-field="formatId">${FORMATS.map((f) => `<option value="${f.id}" ${f.id === draft.formatId ? 'selected' : ''}>${f.id === 'Custom' ? 'Custom' : `${f.id} · 1 GK + ${f.field}`}</option>`).join('')}</select>
      </label>
      <div class="row gap">
        <label class="grow">Field players<input type="number" inputmode="numeric" min="1" max="10" data-field="field" value="${esc(draft.field)}"></label>
        <label class="grow">Periods<input type="number" inputmode="numeric" min="1" max="4" data-field="periods" value="${esc(draft.periods)}"></label>
        <label class="grow">Min/period<input type="number" inputmode="numeric" min="1" data-field="periodMin" value="${esc(draft.periodMin)}"></label>
      </div>
      <label>Auto-stop a half after this many extra minutes (in case you forget)
        <input type="number" inputmode="numeric" min="1" max="60" data-field="maxExtra" value="${esc(draft.maxExtra)}">
      </label>
    </div>

    <h2>Squad <span class="muted small" id="squad-count">${squadCount()}</span></h2>
    <p class="hint">Choose Bench or Start for each player called up, then tap 🧤 on the goalkeeper.</p>
    <ul class="list">${ps.map((p) => {
      const v = draft.sel[p.id] || '';
      return `<li class="item ${v}">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}</span>
        <span class="seg">
          <button class="${v === '' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="">Out</button>
          <button class="${v === 'bench' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="bench">Bench</button>
          <button class="${v === 'start' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="start">Start</button>
        </span>
        <button class="gkbtn ${draft.gkId === p.id ? 'on' : ''}" data-action="set-gk" data-id="${p.id}" ${v === 'start' ? '' : 'disabled'} aria-label="Goalkeeper">🧤</button>
      </li>`;
    }).join('')}</ul>
    <form class="row gap" data-form="add-player-draft">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="Add a new player" required autocomplete="off">
      <button class="btn">Add</button>
    </form>

    <button class="btn primary block" data-action="save-game">${draft.id ? 'Save changes' : 'Create game'}</button>`;
}

function saveGame() {
  const field = parseInt(draft.field, 10);
  const periods = parseInt(draft.periods, 10);
  const periodMin = parseInt(draft.periodMin, 10);
  const maxExtra = parseInt(draft.maxExtra, 10) || 10;
  if (!(field >= 1)) return alert('Set the number of field players.');
  if (!(periods >= 1) || !(periodMin >= 1)) return alert('Set the number of periods and minutes per period.');
  if (!draft.date) return alert('Set the game date.');

  const order = [...db.players].sort(byNumber).map((p) => p.id);
  const squad = order.filter((id) => draft.sel[id]);
  const starters = squad.filter((id) => draft.sel[id] === 'start');
  const need = field + 1;
  if (starters.length !== need) return alert(`Pick exactly ${need} starters (1 GK + ${field}). You have ${starters.length}.`);
  if (!starters.includes(draft.gkId)) return alert('Tap 🧤 to choose the goalkeeper among the starters.');

  let g = draft.id && getGame(draft.id);
  if (!g) {
    g = { id: uid(), status: 'scheduled', clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 }, events: [], marks: [], alerted: {} };
    db.games.push(g);
  }
  const names = {};
  for (const id of squad) {
    const p = db.players.find((x) => x.id === id);
    names[id] = { name: p.name, number: p.number };
  }
  Object.assign(g, {
    date: draft.date, time: draft.time, opponent: draft.opponent.trim(), formatId: draft.formatId,
    field, periods, periodMin, maxExtra, squad, starters, gkId: draft.gkId, names,
  });
  save();
  location.hash = `#/game/${g.id}`;
}

// ---------- Views: live game ----------

function clockButtons(g) {
  const c = g.clock;
  const b = (action, label, cls = '') => `<button class="btn ${cls}" data-action="${action}">${label}</button>`;
  switch (g.status) {
    case 'scheduled': return b('kickoff', '▶ Kick off', 'primary');
    case 'live':
      return (c.running ? b('pause', '⏸ Pause') : b('resume', '▶ Resume', 'primary')) +
        b('end-period', c.period >= g.periods ? '🏁 Full time' : `End ${periodName(g, c.period)}`, 'warn');
    case 'break': return b('next-period', `▶ Start ${periodName(g, c.period + 1)}`, 'primary');
    default: return `<a class="btn primary" href="#/report/${g.id}">📋 View report</a>`;
  }
}

function chip(g, d, id, where) {
  const s = d.stats[id];
  const p = g.names[id];
  const badges = [
    s.goals ? `⚽${s.goals > 1 ? s.goals : ''}` : '',
    '🟨'.repeat(s.yellow),
    '🟥'.repeat(s.red),
  ].join('');
  return `<button class="chip ${where} ${id === d.gk ? 'gk' : ''}" data-action="player" data-id="${id}" ${where === 'off' ? 'disabled' : ''}>
    <span class="shirt">${esc(p.number) || '–'}</span>
    <span class="pname">${esc(p.name)}${id === d.gk ? ' <span class="tag">GK</span>' : ''}</span>
    <span class="meta"><span data-pt="${id}">${fmtMins(s.played)}</span> ${badges}</span>
  </button>`;
}

function viewGame(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const onIds = sortIds(g, d.on).sort((a, b) => (b === d.gk) - (a === d.gk));
  const benchIds = g.squad
    .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
    .sort((a, b) => d.stats[a].played - d.stats[b].played || byNumber(g.names[a], g.names[b]));
  const offIds = sortIds(g, [...d.sentOff].filter((p) => !d.on.has(p)));

  const timeline = [...g.events, ...g.marks].sort((a, b) => a.t - b.t || (a.wall || 0) - (b.wall || 0)).reverse();
  const last = g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;

  main.innerHTML = `
    ${bar(`vs ${esc(g.opponent || 'Opponent')}`, '#/games')}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      <div class="muted small">${esc(fmtDate(g))} · ${esc(g.formatId)} · 1 GK + ${g.field}</div>
      <div class="score big">${d.us} – ${d.them}</div>
      <div class="clock" id="clock">${fmtClock(matchTime(g))}</div>
      <div class="muted" id="period">${periodLabel(g)}</div>
      ${g.status === 'break' && g.autoStopped === g.clock.period ? `<div class="alert">⏱ ${periodName(g, g.clock.period)} was stopped automatically at +${g.maxExtra ?? 10} min. If it ended earlier or the next half already started, tap <b>Fix times</b>.</div>` : ''}
      <div class="row gap center wrap">${clockButtons(g)}</div>
      <div class="row gap center wrap">
        <button class="btn small ghost" data-action="opp-goal">+ Goal conceded</button>
        ${g.status !== 'scheduled' ? '<button class="btn small ghost" data-action="fix-open">⏱ Fix times</button>' : ''}
      </div>
    </section>

    <p class="hint center-text">Tap a player for subs, goals &amp; cards · hold and drag onto another player to sub</p>

    <h2>On pitch <span class="muted small">${d.on.size}/${g.field + 1}</span></h2>
    <div class="grid">${onIds.map((p) => chip(g, d, p, 'on')).join('')}</div>

    <h2>Bench</h2>
    ${benchIds.length ? `<div class="grid">${benchIds.map((p) => chip(g, d, p, 'bench')).join('')}</div>` : '<p class="empty small">No substitutes.</p>'}

    ${offIds.length ? `<h2>Sent off</h2><div class="grid">${offIds.map((p) => chip(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>Timeline</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">↶ Undo: ${describe(g, last)}</button>` : ''}
    ${timeline.length ? `<ul class="timeline">${timeline.map((e) => `<li><span class="t">${fmtClock(e.t)}</span><span>${describe(g, e)}</span></li>`).join('')}</ul>` : '<p class="empty small">Nothing yet.</p>'}

    <div class="row gap foot">
      ${canEdit ? `<a class="btn ghost" href="#/edit/${g.id}">Edit</a>` : ''}
      ${g.status !== 'scheduled' ? `<a class="btn ghost" href="#/report/${g.id}">Report</a>` : ''}
      <button class="btn ghost danger" data-action="delete-game">Delete game</button>
    </div>`;
}

function tick() {
  for (const g of db.games) if (g.status === 'live' && g.clock.running) checkTime(g);
  const { view, id } = route();
  if (view !== 'game') return;
  const g = getGame(id);
  if (!g || g.status !== 'live' || !g.clock.running) return;
  const d = derive(g);
  $('#clock').textContent = fmtClock(matchTime(g));
  $('#period').textContent = periodLabel(g);
  for (const p of g.squad) {
    const el = main.querySelector(`[data-pt="${p}"]`);
    if (el) el.textContent = fmtMins(d.stats[p].played);
  }
  $('.scoreboard')?.classList.toggle('overtime', matchTime(g) - periodStart(g) >= g.periodMin * 60000);
}

setInterval(tick, 1000);

// ---------- Sheets (player actions) ----------

function openSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
}

function closeSheet() {
  $('#sheet').hidden = true;
}

function currentGame() {
  const { view, id } = route();
  return (view === 'game' || view === 'report') ? getGame(id) : null;
}

// One tap on a player: quick actions on top, substitution list right below,
// so every action is at most two taps away.
function openPlayerSheet(g, id) {
  const d = derive(g);
  const on = d.on.has(id);
  const quick = (action, icon, label, show = true) => show
    ? `<button class="quick" data-action="${action}" data-id="${id}"><span class="qi">${icon}</span>${label}</button>`
    : '';

  // Fewest minutes first when choosing who comes on, most minutes first for who comes off.
  const candidates = on
    ? g.squad.filter((p) => !d.on.has(p) && !d.sentOff.has(p)).sort((a, b) => d.stats[a].played - d.stats[b].played)
    : [...d.on].sort((a, b) => d.stats[b].played - d.stats[a].played);
  const list = candidates.map((p) => {
    const [out, inn] = on ? [id, p] : [p, id];
    return `<button class="opt" data-action="do-sub" data-out="${out}" data-in="${inn}">
      <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}${p === d.gk ? ' <span class="tag">GK</span>' : ''}</span>
      <span class="muted">${fmtMins(d.stats[p].played)}</span>
    </button>`;
  }).join('');

  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? ' <span class="tag">GK</span>' : ''}</h3>
      <span class="muted small">${on ? 'On pitch' : 'Bench'} · ${fmtMins(d.stats[id].played)} played</span>
    </div>
    <div class="quick-row">
      ${quick('goal', '⚽', 'Goal', on)}
      ${quick('yellow', '🟨', 'Yellow')}
      ${quick('red', '🟥', 'Red')}
      ${quick('make-gk', '🧤', 'To goal', on && d.gk !== id)}
    </div>
    <p class="muted small sub-title">🔁 ${on ? 'Sub off, bring on:' : 'Sub on, replacing:'}</p>
    ${list || '<p class="empty small">No players available.</p>'}
    <button class="btn ghost block" data-action="close-sheet">Cancel</button>`);
}

// ---------- Fix times (forgot to end / start a half) ----------

let fix = null;

// The latest moment the current period could have ended, in minutes of that period.
function fixLimits(g) {
  const start = periodStart(g);
  if (g.status === 'live') return { maxMin: (matchTime(g) - start) / 60000 };
  const end = [...g.marks].reverse().find((m) => m.type === 'end');
  return { maxMin: (end.t - start + (Date.now() - end.wall)) / 60000 };
}

function fixPreview(g) {
  const p = g.clock.period;
  const over = fix.end - g.periodMin;
  let text = `${periodName(g, p)} ends at ${fmtClock(fix.end * 60000)}${over > 0 ? ` (+${fmtClock(over * 60000)})` : ''}`;
  if (p < g.periods) text += fix.started == null ? ' · now on break' : ` · ${periodName(g, p + 1)} started ${fix.started} min ago`;
  return text;
}

function openFixSheet(g) {
  const p = g.clock.period;
  const { maxMin } = fixLimits(g);
  if (!fix) fix = { end: Math.min(g.periodMin, maxMin), started: null };
  const pick = (action, v, label, on) => `<button class="pick ${on ? 'on' : ''}" data-action="${action}" data-v="${v}">${label}</button>`;
  const ends = [0, 1, 2, 3, 5].map((x) => g.periodMin + x).filter((v) => v <= maxMin);
  const canResume = p < g.periods && g.status !== 'finished';
  const room = maxMin - fix.end;
  openSheet(`
    <h3>⏱ Fix times · ${periodName(g, p)}</h3>
    <p class="muted small">When did the ${periodName(g, p)} really end?</p>
    <div class="pick-row">
      ${ends.map((v) => pick('fix-end', v, v === g.periodMin ? `${v}' regular` : `+${v - g.periodMin}'`, fix.end === v)).join('')}
      ${g.status === 'live' ? pick('fix-end', maxMin, 'Now', fix.end === maxMin) : ''}
    </div>
    <label class="inline">Other: <input type="number" inputmode="decimal" min="0" step="0.5" data-fix="end" placeholder="${g.periodMin}"> min</label>
    ${canResume ? `
      <p class="muted small">Has the ${periodName(g, p + 1)} already started?</p>
      <div class="pick-row">
        ${pick('fix-started', '', 'Not yet', fix.started == null)}
        ${[1, 2, 3, 5, 10, 15].filter((v) => v <= room).map((v) => pick('fix-started', v, `${v} min ago`, fix.started === v)).join('')}
      </div>
      <label class="inline">Started <input type="number" inputmode="decimal" min="0" step="0.5" data-fix="started"> min ago</label>` : ''}
    <p class="alert small" id="fix-preview">${fixPreview(g)}</p>
    <button class="btn primary block" data-action="fix-apply">Apply</button>
    <button class="btn ghost block" data-action="close-sheet">Cancel</button>`);
}

// ---------- Report ----------

function reportRows(g, d) {
  return sortIds(g, g.squad).map((id) => {
    const s = d.stats[id];
    const intervals = s.intervals.map(([a, b]) => `${fmtClock(a)}–${fmtClock(b)}`);
    return { id, p: g.names[id], s, intervals };
  });
}

function viewReport(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const rows = reportRows(g, d);
  const yellows = rows.reduce((n, r) => n + r.s.yellow, 0);
  const reds = rows.reduce((n, r) => n + r.s.red, 0);

  main.innerHTML = `
    ${bar('Game report', `#/game/${g.id}`)}
    <section class="scoreboard">
      <strong>vs ${esc(g.opponent || 'Opponent')}</strong>
      <div class="muted small">${esc(fmtDate(g))} · ${esc(g.formatId)} · 1 GK + ${g.field}</div>
      <div class="score big">${d.us} – ${d.them}</div>
      <div class="muted">Game time ${fmtClock(matchTime(g))}${g.status === 'finished' ? '' : ' · <span class="warn">game still in progress</span>'}</div>
    </section>

    <table class="report">
      <thead><tr><th>Player</th><th>Min</th><th>⚽</th><th>🟨</th><th>🟥</th></tr></thead>
      <tbody>${rows.map((r) => `
        <tr class="main-row">
          <td><span class="shirt sm">${esc(r.p.number) || '–'}</span> ${esc(r.p.name)}${r.id === g.gkId ? ' <span class="tag">GK</span>' : ''}</td>
          <td>${fmtClock(r.s.played)}</td><td>${r.s.goals || ''}</td><td>${r.s.yellow || ''}</td><td>${r.s.red || ''}</td>
        </tr>
        <tr class="sub-row"><td colspan="5">${r.intervals.length
          ? r.intervals.map((iv) => `<span class="iv">${iv}</span>`).join(' ')
          : '<span class="muted">Did not play</span>'}${r.s.redAt != null ? ` <span class="warn">sent off ${fmtClock(r.s.redAt)}</span>` : ''}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td>Team</td><td></td><td>${d.us}</td><td>${yellows || ''}</td><td>${reds || ''}</td></tr></tfoot>
    </table>
    <p class="hint">Times are game-clock time (mm:ss). Each chip shows a stint on the pitch: entered–left.</p>

    <div class="row gap">
      <button class="btn primary grow" data-action="share">Share summary</button>
      <button class="btn grow" data-action="csv">Download CSV</button>
    </div>`;
}

function reportText(g) {
  const d = derive(g);
  const lines = [
    `vs ${g.opponent || 'Opponent'} — ${fmtDate(g)} (${g.formatId}, 1 GK + ${g.field})`,
    `Result: ${d.us}–${d.them} · Game time ${fmtClock(matchTime(g))}`,
    '',
  ];
  for (const r of reportRows(g, d)) {
    const extras = [r.s.goals && `⚽${r.s.goals}`, r.s.yellow && `🟨${r.s.yellow}`, r.s.red && `🟥${r.s.red}`].filter(Boolean).join(' ');
    lines.push(`${pname(g, r.id)} — ${fmtClock(r.s.played)}${extras ? ` · ${extras}` : ''}`);
    lines.push(`   ${r.intervals.length ? r.intervals.join(', ') : 'Did not play'}`);
  }
  return lines.join('\n');
}

function reportCsv(g) {
  const d = derive(g);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['number', 'name', 'minutes_played', 'goals', 'yellow', 'red', 'stints (entered-left)'];
  const lines = [head.map(q).join(',')];
  for (const r of reportRows(g, d)) {
    lines.push([r.p.number, r.p.name, (r.s.played / 60000).toFixed(1), r.s.goals, r.s.yellow, r.s.red, r.intervals.join('; ')].map(q).join(','));
  }
  return lines.join('\n');
}

// ---------- Actions ----------

const actions = {
  'close-sheet': () => closeSheet(),

  // roster
  'edit-player': ({ id }) => {
    const p = db.players.find((x) => x.id === id);
    const name = prompt('Name', p.name);
    if (name == null || !name.trim()) return;
    const number = prompt('Shirt number', p.number);
    p.name = name.trim();
    if (number != null) p.number = number.trim();
    save();
    render();
  },
  'delete-player': ({ id }) => {
    const p = db.players.find((x) => x.id === id);
    if (!confirm(`Remove ${p.name} from the roster? Past games keep their stats.`)) return;
    db.players = db.players.filter((x) => x.id !== id);
    save();
    render();
  },

  // new / edit game
  sel: ({ id, v }) => {
    if (v) draft.sel[id] = v;
    else delete draft.sel[id];
    if (v !== 'start' && draft.gkId === id) draft.gkId = null;
    render();
  },
  'set-gk': ({ id }) => {
    draft.gkId = id;
    render();
  },
  'save-game': () => saveGame(),

  // clock
  kickoff: () => {
    const g = currentGame();
    g.status = 'live';
    g.clock.period = 1;
    g.marks.push({ type: 'start', period: 1, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },
  pause: () => { const g = currentGame(); stopClock(g); save(); render(); },
  resume: () => { const g = currentGame(); startClock(g); save(); render(); },
  'end-period': () => {
    const g = currentGame();
    const last = g.clock.period >= g.periods;
    if (g.status !== 'live') return;
    if (last && !confirm('End the game (full time)?')) return;
    endPeriodAt(g, matchTime(g));
    $('#toast').hidden = true;
    buzz();
    save();
    if (last) location.hash = `#/report/${g.id}`;
    else render();
  },
  'next-period': () => {
    const g = currentGame();
    g.clock.period++;
    g.status = 'live';
    g.autoStopped = null;
    g.marks.push({ type: 'start', period: g.clock.period, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },

  // player actions
  player: ({ id }) => openPlayerSheet(currentGame(), id),
  'do-sub': ({ out, in: inn }) => doSub(currentGame(), out, inn),
  goal: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'goal', playerId: id });
    render();
    toast(`⚽ Goal: ${g.names[id].name}`, undoBtn(eid));
  },
  yellow: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'yellow', playerId: id });
    render();
    toast(`🟨 Yellow: ${g.names[id].name}`, undoBtn(eid));
  },
  red: ({ id }) => {
    const g = currentGame();
    const wasGk = derive(g).gk === id;
    const eid = addEvent(g, { type: 'red', playerId: id });
    render();
    toast(wasGk ? '🟥 GK sent off: tap a player › To goal' : `🟥 Red: ${g.names[id].name}`, undoBtn(eid));
  },
  'make-gk': ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'gk', playerId: id });
    render();
    toast(`🧤 ${g.names[id].name} in goal`, undoBtn(eid));
  },
  'opp-goal': () => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'oppgoal' });
    render();
    toast('🥅 Goal conceded', undoBtn(eid));
  },
  'fix-open': () => {
    const g = currentGame();
    if (!g || g.status === 'scheduled') return;
    $('#toast').hidden = true;
    fix = null;
    openFixSheet(g);
  },
  'fix-end': ({ v }) => {
    fix.end = Number(v);
    openFixSheet(currentGame());
  },
  'fix-started': ({ v }) => {
    fix.started = v === '' ? null : Number(v);
    openFixSheet(currentGame());
  },
  'fix-apply': () => {
    const g = currentGame();
    const { maxMin } = fixLimits(g);
    if (!(fix.end >= 0) || fix.end > maxMin + 0.01) return alert(`The end must be between 0 and ${fmtClock(maxMin * 60000)}.`);
    if (fix.started != null && !(fix.started >= 0 && fix.started <= maxMin - fix.end + 0.01)) {
      return alert(`That's longer ago than the time since the ${periodName(g, g.clock.period)} ended.`);
    }
    applyFix(g, Math.min(fix.end, maxMin), fix.started);
    fix = null;
    buzz();
    render();
    toast('⏱ Times fixed');
  },
  'undo-toast': ({ id }) => {
    const g = currentGame();
    $('#toast').hidden = true;
    if (!g || g.events[g.events.length - 1]?.id !== id) return;
    g.events.pop();
    save();
    render();
  },
  undo: () => {
    const g = currentGame();
    if (!g.events.length) return;
    g.events.pop();
    buzz();
    save();
    render();
  },
  'delete-game': () => {
    const g = currentGame();
    if (!confirm('Delete this game and all its stats?')) return;
    db.games = db.games.filter((x) => x !== g);
    save();
    location.hash = '#/games';
  },

  // report
  share: async () => {
    const g = currentGame();
    const text = reportText(g);
    try {
      if (navigator.share) await navigator.share({ title: `vs ${g.opponent}`, text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Summary copied');
      }
    } catch {}
  },
  csv: () => {
    const g = currentGame();
    const name = `${g.date}_vs_${(g.opponent || 'opponent').replace(/[^\w-]+/g, '_')}.csv`;
    download(name, reportCsv(g), 'text/csv');
  },

  // backup
  backup: () => download(`fut-academy-backup-${isoDate(new Date())}.json`, JSON.stringify(db, null, 2), 'application/json'),
};

document.addEventListener('click', (e) => {
  if (drag.suppressClick) {
    e.preventDefault();
    return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el);
});

document.addEventListener('input', (e) => {
  const fixKey = e.target.dataset.fix;
  if (fixKey && fix) {
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (fixKey === 'end') fix.end = v ?? Math.min(currentGame().periodMin, fixLimits(currentGame()).maxMin);
    else fix.started = v;
    for (const b of $$(`#sheet .pick[data-action="fix-${fixKey}"]`)) b.classList.remove('on');
    $('#fix-preview').textContent = fixPreview(currentGame());
    return;
  }
  const field = e.target.dataset.field;
  if (!field || !draft) return;
  draft[field] = e.target.value;
  if (field === 'formatId') {
    const f = FORMATS.find((x) => x.id === draft.formatId);
    if (f && f.id !== 'Custom') Object.assign(draft, { field: f.field, periods: f.periods, periodMin: f.periodMin });
    render();
  } else if (field === 'field') {
    $('#squad-count').innerHTML = squadCount();
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.dataset.change !== 'restore') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.players) || !Array.isArray(data.games)) throw new Error('bad file');
    if (!confirm(`Replace all data with this backup (${data.players.length} players, ${data.games.length} games)?`)) return;
    db = data;
    save();
    render();
    toast('Backup restored');
  } catch {
    alert('That file is not a valid backup.');
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  const data = new FormData(e.target);
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const p = { id: uid(), name, number: String(data.get('number') || '').trim() };
  db.players.push(p);
  save();
  if (form === 'add-player-draft') draft.sel[p.id] = 'bench';
  render();
  main.querySelector(`[data-form="${form}"] input[name="${form === 'add-player' ? 'number' : 'name'}"]`)?.focus();
});

// ---------- Drag a player onto another to substitute ----------
// Hold a player briefly, then drag onto a player in the other group (bench <-> pitch).
// A quick swipe still scrolls the page; a plain tap still opens the player sheet.

const drag = { timer: null, active: false, moved: false, from: null, x0: 0, y0: 0, ghost: null, target: null, suppressClick: false };

function chipAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.chip');
  return el && !el.disabled ? el : null;
}

function dragStart(chip, x, y) {
  if (chip.disabled || route().view !== 'game') return;
  Object.assign(drag, { from: chip, x0: x, y0: y, moved: false, target: null });
  drag.timer = setTimeout(() => {
    drag.active = true;
    buzz();
    const r = chip.getBoundingClientRect();
    const ghost = chip.cloneNode(true);
    ghost.className += ' ghost';
    Object.assign(ghost.style, { width: `${r.width}px`, left: `${x - r.width / 2}px`, top: `${y - r.height / 2}px` });
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    chip.classList.add('dragging');
    document.body.classList.add('is-dragging', chip.classList.contains('on') ? 'from-on' : 'from-bench');
  }, 220);
}

function dragMove(x, y, e) {
  if (!drag.from) return;
  if (!drag.active) {
    if (Math.hypot(x - drag.x0, y - drag.y0) > 10) dragCancel();
    return;
  }
  e.preventDefault();
  drag.moved = true;
  const r = drag.ghost.getBoundingClientRect();
  drag.ghost.style.left = `${x - r.width / 2}px`;
  drag.ghost.style.top = `${y - r.height / 2}px`;
  const t = chipAt(x, y);
  const valid = t && t !== drag.from && t.classList.contains('on') !== drag.from.classList.contains('on');
  drag.target?.classList.remove('drop');
  drag.target = valid ? t : null;
  drag.target?.classList.add('drop');
}

function dragEnd() {
  if (!drag.from) return;
  const { active, moved, from, target } = drag;
  dragCancel();
  if (!active) return;
  drag.suppressClick = true;
  setTimeout(() => (drag.suppressClick = false), 400);
  const g = currentGame();
  if (target) {
    const fromOn = from.classList.contains('on');
    const [out, inn] = fromOn ? [from.dataset.id, target.dataset.id] : [target.dataset.id, from.dataset.id];
    doSub(g, out, inn);
  } else if (!moved) {
    openPlayerSheet(g, from.dataset.id);
  }
}

function dragCancel() {
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.from?.classList.remove('dragging');
  drag.target?.classList.remove('drop');
  document.body.classList.remove('is-dragging', 'from-on', 'from-bench');
  Object.assign(drag, { timer: null, active: false, from: null, ghost: null, target: null });
}

document.addEventListener('touchstart', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && e.touches.length === 1) dragStart(chip, e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
document.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
document.addEventListener('touchend', dragEnd);
document.addEventListener('touchcancel', dragCancel);

// Mouse version, handy when testing on a computer.
document.addEventListener('mousedown', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && e.button === 0) dragStart(chip, e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY, e));
document.addEventListener('mouseup', dragEnd);

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.chip')) e.preventDefault();
});

// ---------- Keep the screen on during a live game ----------

let wakeLock = null;
let wakePending = false;

async function updateWakeLock() {
  const { view, id } = route();
  const g = view === 'game' && getGame(id);
  const want = !!g && g.status === 'live' && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && !wakePending && 'wakeLock' in navigator) {
      wakePending = true;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {} finally {
    wakePending = false;
  }
}

document.addEventListener('visibilitychange', updateWakeLock);

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
tick(); // apply any auto-stop that was due while the app was closed
