// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// The live game screen: clock, score, pitch and bench, timeline; the player sheet and the
// Fix times sheet. Moved from app/legacy.js.
import { readOnlyTeam } from '@/data/access';
import { addEvent, applyFix, endPeriodAt, startClock } from '@/data/live';
import { getTeam } from '@/data/queries';
import { save } from '@/data/save';
import { teamLabel } from '@/domain/titles';
import { doSub, movePlayer, undoBtn } from '@/features/live-game/live-game';
import { defaultTeamId } from '@/data/prefs';
import { buzz } from '@/shared/lib/device';
import { rerender } from '@/shared/lib/rerender';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { closeSheet } from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';
import { notFound } from '@/shared/ui/not-found';
import { checkTime, describe } from '@/features/live-game/live-game';
import { fmtNow, formationOf, matchTime } from '@/data/live';
import { $ } from '@/shared/lib/dom';
import { readOnlyGame } from '@/data/access';
import { readOnlyPill } from '@/features/team-access/read-only';
import { derive, getGame } from '@/data/queries';
import { route } from '@/shared/lib/route';
import { scoreHtml } from '@/features/score/score';
import { bar } from '@/shared/ui/bar';
import { openSheet } from '@/shared/ui/sheet';
import { db } from '@/data/store';
import { fmtMins } from '@/shared/lib/format';
import { esc } from '@/shared/lib/html';
import { formationsFor } from '@/domain/formats';
import { fmtInPeriod, periodLabel, periodStart, timeOf } from '@/domain/clock';
import { slotCoords } from '@/domain/pitch';
import { byNumber, pname, sortIds } from '@/domain/players';
import { gameTeam, matchTitle, periodName } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';

// ---------- Views: live game ----------

export function clockButtons(g) {
  const c = g.clock;
  const b = (action, label, cls = '') =>
    `<button class="btn small ${cls}" data-action="${action}">${label}</button>`;
  switch (g.status) {
    case 'scheduled':
      return b('kickoff', t('kickoff'), 'primary');
    case 'live':
      return b(
        'end-period',
        c.period >= g.periods ? t('fullTimeBtn') : t('endPeriod', { p: periodName(g, c.period) }),
        'warn',
      );
    case 'break':
      return b('next-period', t('startPeriod', { p: periodName(g, c.period + 1) }), 'primary');
    default:
      return `<a class="btn primary" href="#/report/${g.id}">${t('viewReport')}</a>`;
  }
}

export const gkTag = () => ` <span class="tag">${t('gk')}</span>`;

export const PITCH_LINES = `<svg class="pitch-lines" viewBox="0 0 100 130" aria-hidden="true">
  <rect x="3" y="3" width="94" height="124" rx="1"/>
  <line x1="3" y1="65" x2="97" y2="65"/><circle cx="50" cy="65" r="11"/><circle class="dot" cx="50" cy="65" r=".8"/>
  <rect x="24" y="3" width="52" height="19"/><rect x="37" y="3" width="26" height="7"/>
  <rect x="24" y="108" width="52" height="19"/><rect x="37" y="120" width="26" height="7"/>
  <path d="M40 22a11 11 0 0 0 20 0M40 108a11 11 0 0 1 20 0"/>
</svg>`;

// Round player token: shirt circle with minutes played in a pill on its bottom edge, the name
// below, and small badges on the circle (cards top-right, goals bottom-right).
// They are chips too, so tap and drag work the same. where: 'on' (pitch), 'bench' or 'off' (sent off).
export function token(g, d, id, where, attrs = '') {
  const s = d.stats[id];
  const cards = s.red
    ? '<span class="tb tb-card tb-red" aria-hidden="true"></span>'
    : s.yellow
      ? `<span class="tb tb-card tb-yellow" aria-hidden="true">${s.yellow > 1 ? s.yellow : ''}</span>`
      : '';
  const goals = s.goals
    ? `<span class="tb tb-goal" aria-hidden="true">⚽${s.goals > 1 ? `<b>${s.goals}</b>` : ''}</span>`
    : '';
  const label = [s.goals ? `⚽×${s.goals}` : '', s.yellow ? `🟨×${s.yellow}` : '', s.red ? '🟥' : '']
    .filter(Boolean)
    .join(' ');
  return `<button class="chip round ${where} ${where === 'on' ? 'tok' : ''} ${id === d.gk ? 'gk' : ''}" data-action="player" data-id="${id}" ${attrs} ${where === 'off' ? 'disabled' : ''}>
    <span class="face">
      <span class="shirt">${esc(g.names[id].number) || '–'}</span>
      ${cards}${goals}
      <span class="mins" data-pt="${id}">${fmtMins(s.played)}</span>
    </span>
    <span class="pname">${esc(g.names[id].name)}</span>${label ? `<span class="sr-only">${label}</span>` : ''}
  </button>`;
}

// On-pitch players in formation, with the formation picker and player count in the top corners.
export function pitch(g, d, ro = false) {
  const pts = slotCoords(formationOf(g));
  return `<div class="pitch">${PITCH_LINES}
    ${
      ro
        ? `<span class="pitch-corner left ro" aria-label="${t('formation')}">${formationOf(g)}</span>`
        : formationsFor(g.field).length > 1
          ? `<button class="pitch-corner left" data-action="formation" aria-label="${t('formation')}">${formationOf(g)} ▾</button>`
          : ''
    }
    <span class="pitch-corner right" aria-label="${t('onPitch')}">${d.on.size}/${g.field + 1}</span>
    ${d.slots
      .map((id, i) => {
        const pos = `data-slot="${i}" style="left:${pts[i].x.toFixed(1)}%;top:${typeof pts[i].y === 'number' ? `${pts[i].y.toFixed(1)}%` : pts[i].y}"`;
        return id
          ? token(g, d, id, 'on', pos)
          : `<div class="chip round slot-empty" ${pos}><span class="shirt"></span></div>`;
      })
      .join('')}</div>`;
}

// LIVE / PAUSED / BREAK / … pill on top of the scoreboard.
export function statusPill(g) {
  const paused = g.status === 'live' && !g.clock.running;
  return `<span class="pill ${paused ? 'paused' : g.status}">${paused ? t('paused') : t(`st_${g.status}`)}</span>`;
}

export function viewGame(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const benchIds = g.squad
    .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
    .sort((a, b) => d.stats[a].played - d.stats[b].played || byNumber(g.names[a], g.names[b]));
  const offIds = sortIds(
    g,
    [...d.sentOff].filter((p) => !d.on.has(p)),
  );

  const timeline = [...g.events.filter((e) => e.type !== 'pos'), ...g.marks]
    .sort((a, b) => a.t - b.t || (a.wall || 0) - (b.wall || 0))
    .reverse();
  const ro = readOnlyGame(g); // coach of this cloud team: no controls that change the game
  const last = ro ? null : g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;
  const us = gameTeam(g) || t('unnamedTeam');
  const them = g.opponent || t('opponent');
  const [home, away] = g.home === false ? [them, us] : [us, them];

  main.innerHTML = `
    ${bar(
      esc(matchTitle(g)),
      '#/games',
      ro
        ? g.status !== 'scheduled'
          ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>`
          : ''
        : `
      ${
        canEdit
          ? `<a class="menu-item" role="menuitem" href="#/edit/${g.id}">✎ ${t('edit')}</a>`
          : `<button class="menu-item" role="menuitem" data-action="edit-info">${t('gameInfo')}</button>`
      }
      ${g.status !== 'scheduled' ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>` : ''}
      ${g.status !== 'scheduled' ? `<button class="menu-item" role="menuitem" data-action="fix-open">${t('fixTimesBtn')}</button>` : ''}
      <button class="menu-item danger" role="menuitem" data-action="delete-game">🗑 ${t('deleteGame')}</button>`,
      ro ? readOnlyPill() : '',
    )}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      ${statusPill(g)}
      <div class="clock-line">
        <span class="clock" id="clock">${fmtNow(g)}</span>
        ${g.status === 'live' && !g.clock.running && !ro ? `<button class="icon-btn on" data-action="resume" aria-label="${t('resume')}">▶</button>` : ''}
      </div>
      <div class="muted small" id="period">${periodLabel(g)}</div>
      <div class="score-row">
        <span class="side">${esc(home)}</span>
        <span class="score big">${scoreHtml(g, d, ' – ', true)}</span>
        <span class="side">${esc(away)}</span>
      </div>
      ${
        g.status === 'break' && g.autoStopped === g.clock.period && !ro
          ? `<div class="alert">${t('autoStoppedAlert', { p: periodName(g, g.clock.period), m: g.maxExtra ?? 10, fix: t('fixTimes') })}
        <div class="row center"><button class="btn small" data-action="fix-open">${t('fixTimesBtn')}</button></div></div>`
          : ''
      }
      ${
        ro
          ? g.status === 'finished'
            ? `<div class="row gap center wrap score-actions">${clockButtons(g)}</div>`
            : ''
          : `<div class="row gap center wrap score-actions">
        ${g.status === 'live' ? `<button class="btn small ghost" data-action="opp-goal">${t('oppGoalBtn')}</button>` : ''}
        ${clockButtons(g)}
      </div>`
      }
      ${pitch(g, d, ro)}
    </section>

    <h2>${t('bench')}</h2>
    ${benchIds.length ? `<div class="round-row">${benchIds.map((p) => token(g, d, p, 'bench')).join('')}</div>` : `<p class="empty small">${t('noSubs')}</p>`}

    ${offIds.length ? `<h2>${t('sentOff')}</h2><div class="round-row">${offIds.map((p) => token(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>${t('timeline')}</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">${t('undoX', { x: describe(g, last) })}</button>` : ''}
    ${
      timeline.length
        ? `<ul class="timeline">${timeline
            .map((e) =>
              e.type === 'goal' && !ro
                ? `<li class="tap" data-action="edit-goal" data-id="${e.id}"><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span><span class="edit">✎</span></li>`
                : `<li><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span></li>`,
            )
            .join('')}</ul>`
        : `<p class="empty small">${t('nothingYet')}</p>`
    }
`;
}

export function tick() {
  // Read-only games (coach): reminders and the auto-stop are the director's phone's job.
  for (const g of db.games) if (g.status === 'live' && g.clock.running && !readOnlyGame(g)) checkTime(g);
  const { view, id } = route();
  if (view !== 'game') return;
  const g = getGame(id);
  if (!g || g.status !== 'live' || !g.clock.running) return;
  const d = derive(g);
  $('#clock').textContent = fmtNow(g);
  $('#period').textContent = periodLabel(g);
  for (const p of g.squad) {
    const el = main.querySelector(`[data-pt="${p}"]`);
    if (el) el.textContent = fmtMins(d.stats[p].played);
  }
  $('.scoreboard')?.classList.toggle('overtime', matchTime(g) - periodStart(g) >= g.periodMin * 60000);
}

// ---------- Sheets (player actions) ----------

export function currentGame() {
  const { view, id } = route();
  return view === 'game' || view === 'report' ? getGame(id) : null;
}

// One tap on a player: quick actions on top, substitution list right below,
// so every action is at most two taps away.
export function openPlayerSheet(g, id) {
  const d = derive(g);
  const on = d.on.has(id);
  const quick = (action, icon, label, show = true) =>
    show
      ? `<button class="quick" data-action="${action}" data-id="${id}"><span class="qi">${icon}</span>${label}</button>`
      : '';

  // Fewest minutes first when choosing who comes on, most minutes first for who comes off.
  const candidates = on
    ? g.squad
        .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
        .sort((a, b) => d.stats[a].played - d.stats[b].played)
    : [...d.on].sort((a, b) => d.stats[b].played - d.stats[a].played);
  const list = candidates
    .map((p) => {
      const [out, inn] = on ? [id, p] : [p, id];
      return `<button class="opt" data-action="do-sub" data-out="${out}" data-in="${inn}">
      <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}${p === d.gk ? gkTag() : ''}</span>
      <span class="muted">${fmtMins(d.stats[p].played)}</span>
    </button>`;
    })
    .join('');

  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${on ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(d.stats[id].played) })}</span>
    </div>
    <div class="quick-row">
      ${quick('goal', '⚽', t('goalBtn'), on && g.status === 'live')}
      ${quick('yellow', '🟨', t('yellowBtn'))}
      ${quick('red', '🟥', t('redBtn'))}
      ${quick('make-gk', '🧤', t('toGoal'), on && d.gk !== id)}
    </div>
    <p class="muted small sub-title">${on ? t('subOff') : t('subOn')}</p>
    ${list || `<p class="empty small">${t('noAvail')}</p>`}
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

// ---------- Fix times (forgot to end / start a half) ----------
// fix.end is minutes into the current period; the sheet shows game-clock minutes.

export let fix = null;

export const periodOffsetMin = (g) => (g.clock.period - 1) * g.periodMin;

// The latest moment the current period could have ended, in minutes of that period.
export function fixLimits(g) {
  const start = periodStart(g);
  if (g.status === 'live') return { maxMin: (matchTime(g) - start) / 60000 };
  const end = [...g.marks].reverse().find((m) => m.type === 'end');
  return { maxMin: (end.t - start + (Date.now() - end.wall)) / 60000 };
}

export function fixPreview(g) {
  const p = g.clock.period;
  let text = t('previewEnds', { p: periodName(g, p), t: fmtInPeriod(g, p, fix.end * 60000) });
  if (p < g.periods)
    text +=
      fix.started == null
        ? t('previewBreak')
        : t('previewStarted', { p: periodName(g, p + 1), n: fix.started });
  return text;
}

export function openFixSheet(g) {
  const p = g.clock.period;
  const off = periodOffsetMin(g);
  const { maxMin } = fixLimits(g);
  if (!fix) fix = { end: Math.min(g.periodMin, maxMin), started: null };
  const pick = (action, v, label, on) =>
    `<button class="pick ${on ? 'on' : ''}" data-action="${action}" data-v="${v}">${label}</button>`;
  const ends = [0, 1, 2, 3, 5].map((x) => g.periodMin + x).filter((v) => v <= maxMin);
  const canResume = p < g.periods && g.status !== 'finished';
  const room = maxMin - fix.end;
  openSheet(`
    <h3>${t('fixTitle', { p: periodName(g, p) })}</h3>
    <p class="muted small">${t('whenEnd', { p: periodName(g, p) })}</p>
    <div class="pick-row">
      ${ends.map((v) => pick('fix-end', v, v === g.periodMin ? t('regular', { v: off + v }) : `+${v - g.periodMin}'`, fix.end === v)).join('')}
      ${g.status === 'live' ? pick('fix-end', maxMin, t('now'), fix.end === maxMin) : ''}
    </div>
    <label class="inline">${t('other')} <input type="number" inputmode="decimal" min="${off}" step="0.5" data-fix="end" placeholder="${off + g.periodMin}"> min</label>
    ${
      canResume
        ? `
      <p class="muted small">${t('nextStarted', { p: periodName(g, p + 1) })}</p>
      <div class="pick-row">
        ${pick('fix-started', '', t('notYet'), fix.started == null)}
        ${[1, 2, 3, 5, 10, 15]
          .filter((v) => v <= room)
          .map((v) => pick('fix-started', v, t('minAgo', { n: v }), fix.started === v))
          .join('')}
      </div>
      <label class="inline">${t('startedPre')} <input type="number" inputmode="decimal" min="0" step="0.5" data-fix="started"> ${t('startedPost')}</label>`
        : ''
    }
    <p class="alert small" id="fix-preview">${fixPreview(g)}</p>
    <button class="btn primary block" data-action="fix-apply">${t('apply')}</button>
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

export const gameActions = {
  kickoff: () => {
    const g = currentGame();
    g.status = 'live';
    g.clock.period = 1;
    g.marks.push({ type: 'start', period: 1, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    rerender();
  },
  resume: () => {
    const g = currentGame();
    startClock(g);
    save();
    rerender();
  },
  'end-period': async () => {
    const g = currentGame();
    const last = g.clock.period >= g.periods;
    if (g.status !== 'live') return;
    if (last && !(await askConfirm({ title: t('confirmFullTime'), ok: t('fullTimeBtn') }))) return;
    if (g.status !== 'live') return; // auto-stopped while the popup was open
    endPeriodAt(g, matchTime(g));
    $('#toast').hidden = true;
    buzz();
    save();
    if (last) location.hash = `#/report/${g.id}`;
    else rerender();
  },
  'next-period': () => {
    const g = currentGame();
    g.clock.period++;
    g.status = 'live';
    g.autoStopped = null;
    g.marks.push({ type: 'start', period: g.clock.period, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    rerender();
  },
  player: ({ id }) => (readOnlyGame(currentGame()) ? openPlayerInfo : openPlayerSheet)(currentGame(), id),
  'do-sub': ({ out, in: inn }) => doSub(currentGame(), out, inn),
  goal: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'goal', playerId: id });
    rerender();
    toast(t('evGoal', { p: g.names[id].name }), undoBtn(eid));
  },
  yellow: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'yellow', playerId: id });
    rerender();
    toast(t('evYellow', { p: g.names[id].name }), undoBtn(eid));
  },
  red: ({ id }) => {
    const g = currentGame();
    const wasGk = derive(g).gk === id;
    const eid = addEvent(g, { type: 'red', playerId: id });
    rerender();
    toast(wasGk ? t('gkSentOff') : t('evRed', { p: g.names[id].name }), undoBtn(eid));
  },
  'make-gk': ({ id }) => {
    closeSheet();
    movePlayer(currentGame(), id, 0);
  },
  formation: () => {
    const g = currentGame();
    const cur = formationOf(g);
    openSheet(`
      <h3>${t('formation')}</h3>
      ${formationsFor(g.field)
        .map(
          (f) => `<button class="opt ${f === cur ? 'current' : ''}" data-action="set-formation" data-v="${f}">
        <span>${f}</span>${f === cur ? '<span>✓</span>' : ''}
      </button>`,
        )
        .join('')}
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-formation': ({ v }) => {
    const g = currentGame();
    g.formation = v;
    db.formations = { ...db.formations, [g.field]: v };
    save();
    closeSheet();
    rerender();
  },
  'opp-goal': () => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'oppgoal' });
    rerender();
    toast(t('evOppGoal'), undoBtn(eid));
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
    const p = g.clock.period;
    if (!(fix.end >= 0) || fix.end > maxMin + 0.01) {
      return notify(t('errFixEnd', { a: fmtInPeriod(g, p, 0), b: fmtInPeriod(g, p, maxMin * 60000) }));
    }
    if (fix.started != null && !(fix.started >= 0 && fix.started <= maxMin - fix.end + 0.01)) {
      return notify(t('errFixStart', { p: periodName(g, p) }));
    }
    applyFix(g, Math.min(fix.end, maxMin), fix.started);
    fix = null;
    buzz();
    rerender();
    toast(t('timesFixed'));
  },
  'edit-goal': ({ id }) => {
    const g = currentGame();
    const e = g.events.find((x) => x.id === id);
    const d = derive(g);
    const onAt = g.squad.filter((p) => d.stats[p].intervals.some(([a, b]) => a <= e.t && e.t <= b));
    const ids = sortIds(g, onAt.length ? onAt : g.squad);
    openSheet(`
      <h3>${t('editGoal', { t: timeOf(g, e) })}</h3>
      <p class="muted small sub-title">${t('whoScored')}</p>
      ${ids
        .map(
          (
            p,
          ) => `<button class="opt ${p === e.playerId ? 'current' : ''}" data-action="set-scorer" data-id="${e.id}" data-p="${p}">
        <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}</span>${p === e.playerId ? '<span>⚽</span>' : ''}
      </button>`,
        )
        .join('')}
      <button class="btn ghost danger block" data-action="delete-goal" data-id="${e.id}">${t('removeGoal')}</button>
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-scorer': ({ id, p }) => {
    const g = currentGame();
    g.events.find((x) => x.id === id).playerId = p;
    save();
    buzz();
    rerender();
    toast(t('evGoal', { p: g.names[p].name }));
  },
  'delete-goal': async ({ id }) => {
    const g = currentGame();
    if (!(await askConfirm({ title: t('confirmRemoveGoal'), ok: t('deleteBtn'), danger: true }))) return;
    g.events = g.events.filter((x) => x.id !== id);
    save();
    rerender();
  },
  'undo-toast': ({ id }) => {
    const g = currentGame();
    $('#toast').hidden = true;
    if (!g || g.events[g.events.length - 1]?.id !== id) return;
    g.events.pop();
    save();
    rerender();
  },
  undo: () => {
    const g = currentGame();
    if (!g.events.length) return;
    g.events.pop();
    buzz();
    save();
    rerender();
  },
  'edit-info': () => {
    const g = currentGame();
    const teamId = getTeam(g.teamId) ? g.teamId : defaultTeamId();
    openSheet(`
      <h3>${t('gameInfo')}</h3>
      <form class="form" data-form="game-info">
        ${
          db.teams.length
            ? `<label>${t('team')}
          <select name="teamId">${db.teams
            .filter((tm) => tm.id === teamId || !readOnlyTeam(tm.id))
            .map(
              (tm) =>
                `<option value="${tm.id}" ${tm.id === teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`,
            )
            .join('')}</select>
        </label>`
            : ''
        }
        <label>${t('opponent')}<input name="opponent" autocomplete="off" value="${esc(g.opponent)}"></label>
        <label>${t('homeAway')}
          <select name="home"><option value="1">${t('home')}</option><option value="0" ${g.home === false ? 'selected' : ''}>${t('away')}</option></select>
        </label>
        <label>${t('round')}<input type="number" inputmode="numeric" min="1" name="round" value="${esc(g.round)}"></label>
        <div class="row gap">
          <label class="grow">${t('date')}<input type="date" name="date" value="${esc(g.date)}" required></label>
          <label class="grow">${t('time')}<input type="time" name="time" value="${esc(g.time)}"></label>
        </div>
        <button class="btn primary block">${t('save')}</button>
        <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
      </form>`);
  },
  'delete-game': async () => {
    const g = currentGame();
    if (!g) return;
    const ok = await askConfirm({
      title: t('deleteGameTitle'),
      message: t('confirmDeleteGame'),
      ok: t('deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    db.games = db.games.filter((x) => x !== g);
    save();
    location.hash = '#/games';
  },
};

/** The live game screen: its screen and actions (app/ registers them at startup). */
export const gamePage = { views: { game: viewGame }, actions: gameActions };

// Tap on a player in a read-only game: who it is and how they're doing, no actions.
export function openPlayerInfo(g, id) {
  const d = derive(g);
  const s = d.stats[id];
  const bits = [s.goals && `⚽ ${s.goals}`, s.yellow && `🟨 ${s.yellow}`, s.red && `🟥 ${s.red}`]
    .filter(Boolean)
    .join(' · ');
  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${d.on.has(id) ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(s.played) })}</span>
    </div>
    ${bits ? `<p>${bits}</p>` : ''}
    <p class="hint">${readOnlyPill()} ${t('readOnlyHint')}</p>
    <button class="btn ghost block" data-action="close-sheet">${t('ok')}</button>`);
}
