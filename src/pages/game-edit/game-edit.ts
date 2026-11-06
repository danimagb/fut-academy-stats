import { teamEditableNow } from '@/data/online';
import { isCloudTeam } from '@/data/store';
// The new-game / edit-game screen: team, opponent, format, and who starts.
import { defaultTeamId } from '@/data/prefs';
import { rerender } from '@/shared/lib/rerender';
import { formationOf } from '@/data/live';
import { readOnlyGame, readOnlyTeam, writableTeams } from '@/data/access';
import { readOnlyPill, refuseReadOnly } from '@/features/team-access/read-only';
import { save } from '@/data/save';
import { getGame, getTeam, teamPlayers } from '@/data/queries';
import { bar } from '@/shared/ui/bar';
import { notify } from '@/shared/ui/dialog';
import { uid } from '@/shared/lib/id';
import { db } from '@/data/store';
import { isoDate, pad } from '@/shared/lib/format';
import { esc } from '@/shared/lib/html';
import { FORMATS } from '@/domain/formats';
import { startLineup } from '@/domain/pitch';
import { byNumber } from '@/domain/players';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';
import type { Game, SquadName } from '@/domain/types';

/**
 * The form's state. Number fields hold what was typed (text) until the game is saved; `sel`
 * says who starts and who is on the bench.
 */
export type Draft = {
  /** Set when editing an existing game. */
  id?: string;
  date: string;
  time: string;
  opponent: string;
  formatId: string;
  field: number | string;
  periods: number | string;
  periodMin: number | string;
  maxExtra: number | string;
  gkId: string | null;
  teamId: string | null;
  home: boolean;
  round: string;
  sel: Record<string, 'start' | 'bench'>;
};

const int = (v: number | string): number => parseInt(String(v), 10);

// ---------- Views: new / edit game ----------
// The game being created or edited (null when not on that screen).
export let draft: Draft | null = null;

/** Forget the form (leaving the screen). */
export function resetDraft(): void {
  draft = null;
}

// Teams where this user is a coach (read-only) are never offered for new games.

export function newDraft(id: string | undefined): Draft {
  const g = id ? getGame(id) : undefined;
  if (g) {
    return {
      id: g.id,
      date: g.date,
      time: g.time,
      opponent: g.opponent,
      formatId: g.formatId,
      field: g.field,
      periods: g.periods,
      periodMin: g.periodMin,
      maxExtra: g.maxExtra ?? 10,
      gkId: g.gkId,
      teamId: getTeam(g.teamId) ? g.teamId : defaultTeamId(),
      home: g.home ?? true,
      round: g.round ?? '',
      sel: Object.fromEntries(g.squad.map((p) => [p, g.starters.includes(p) ? 'start' : 'bench'] as const)),
    };
  }
  const f = FORMATS[0];
  if (!f) throw new Error('No game formats');
  const now = new Date();
  return {
    date: isoDate(now),
    time: `${pad(now.getHours())}:00`,
    opponent: '',
    formatId: f.id,
    field: f.field,
    periods: f.periods,
    periodMin: f.periodMin,
    maxExtra: 10,
    gkId: null,
    sel: {},
    teamId: defaultTeamId(),
    home: true,
    round: '',
  };
}

export function squadCount(): string {
  if (!draft) return '';
  const need = (int(draft.field) || 0) + 1;
  const vals = Object.values(draft.sel);
  const starters = vals.filter((v) => v === 'start').length;
  const bench = vals.filter((v) => v === 'bench').length;
  return `<span class="${starters === need ? 'ok' : 'warn'}">${t('startersCount', { s: starters, n: need })}</span> · ${t('benchCount', { n: bench })}`;
}

export function viewEdit(id: string | undefined): void {
  if (!draft) draft = newDraft(id);
  const d = draft;
  const back = d.id ? `#/game/${d.id}` : '#/games';
  const title = d.id ? t('editGame') : t('newGameTitle');
  if (d.id && readOnlyGame(getGame(d.id))) {
    main.innerHTML = `${bar(title, back, '', readOnlyPill())}<p class="empty">${t('readOnlyHint')}</p>`;
    return;
  }
  if (!d.teamId) {
    // Only teams where this user is a coach: explain why there's nothing to pick.
    const msg = db.teams.length ? t('newGameCoachOnly') : t('needTeam');
    main.innerHTML = `${bar(title, back)}<p class="empty">${msg}</p><a class="btn primary block" href="#/teams">${t('goTeams')}</a>`;
    return;
  }
  const ps = teamPlayers(d.teamId).sort(byNumber);
  // Creating or editing a game of a cloud team needs the internet (running it doesn't).
  const offline = !!d.teamId && isCloudTeam(d.teamId) && !teamEditableNow(d.teamId);
  main.innerHTML = `
    ${bar(title, back)}
    ${offline ? `<p class="hint warn" role="status">${t('needsInternet')}</p>` : ''}
    <div class="form">
      <label>${t('team')}
        <select data-field="teamId">${writableTeams()
          .map(
            (tm) =>
              `<option value="${tm.id}" ${tm.id === d.teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`,
          )
          .join('')}</select>
      </label>
      <label>${t('opponent')}<input data-field="opponent" value="${esc(d.opponent)}" placeholder="${t('opponentPh')}" autocomplete="off"></label>
      <div class="row gap">
        <span class="seg big">
          <button class="${d.home ? 'on' : ''}" data-action="set-home" data-v="1">${t('home')}</button>
          <button class="${d.home ? '' : 'on'}" data-action="set-home" data-v="0">${t('away')}</button>
        </span>
        <label class="grow">${t('round')}<input type="number" inputmode="numeric" min="1" data-field="round" value="${esc(d.round)}"></label>
      </div>
      <div class="row gap">
        <label class="grow">${t('date')}<input type="date" data-field="date" value="${esc(d.date)}"></label>
        <label class="grow">${t('time')}<input type="time" data-field="time" value="${esc(d.time)}"></label>
      </div>
      <label>${t('format')}
        <select data-field="formatId">${FORMATS.map((f) => `<option value="${f.id}" ${f.id === d.formatId ? 'selected' : ''}>${f.id === 'Custom' ? t('custom') : `${f.id} · ${t('gkPlus', { n: f.field })}`}</option>`).join('')}</select>
      </label>
      <div class="row gap">
        <label class="grow">${t('fieldPlayers')}<input type="number" inputmode="numeric" min="1" max="10" data-field="field" value="${esc(d.field)}"></label>
        <label class="grow">${t('periods')}<input type="number" inputmode="numeric" min="1" max="4" data-field="periods" value="${esc(d.periods)}"></label>
        <label class="grow">${t('minPeriod')}<input type="number" inputmode="numeric" min="1" data-field="periodMin" value="${esc(d.periodMin)}"></label>
      </div>
      <label>${t('autoStop')}
        <input type="number" inputmode="numeric" min="1" max="60" data-field="maxExtra" value="${esc(d.maxExtra)}">
      </label>
    </div>

    <h2>${t('squad')} <span class="muted small" id="squad-count">${squadCount()}</span></h2>
    <p class="hint">${t('squadHint')}</p>
    <ul class="list squad-pick">${ps
      .map((p) => {
        const v: string = d.sel[p.id] || '';
        return `<li class="item ${v}">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow pname">${esc(p.name)}</span>
        <button class="gkbtn ${d.gkId === p.id ? 'on' : ''}" data-action="set-gk" data-id="${p.id}" ${v === 'start' ? '' : 'disabled'} aria-label="${t('gkAria')}">🧤</button>
        <span class="seg">
          <button class="${v === '' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="">${t('selOut')}</button>
          <button class="${v === 'bench' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="bench">${t('selBench')}</button>
          <button class="${v === 'start' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="start">${t('selStart')}</button>
        </span>
      </li>`;
      })
      .join('')}</ul>
    <form class="row gap" data-form="add-player-draft">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="${t('addNewPlayer')}" required autocomplete="off">
      <button class="btn">${t('add')}</button>
    </form>

    <button class="btn primary block" data-action="save-game">${d.id ? t('saveChanges') : t('createGame')}</button>`;
}

export function saveGame(): Promise<unknown> | void {
  const draft_ = draft;
  if (!draft_) return;
  if (readOnlyTeam(draft_.teamId) || (draft_.id && readOnlyGame(getGame(draft_.id)))) return refuseReadOnly();
  const field = int(draft_.field);
  const periods = int(draft_.periods);
  const periodMin = int(draft_.periodMin);
  const maxExtra = int(draft_.maxExtra) || 10;
  const round = int(draft_.round);
  if (!(field >= 1)) return notify(t('errField'));
  if (!(periods >= 1) || !(periodMin >= 1)) return notify(t('errPeriods'));
  if (!draft_.date) return notify(t('errDate'));

  const team = getTeam(draft_.teamId);
  if (!team) return; // the team was deleted while the form was open
  const order = teamPlayers(team.id)
    .sort(byNumber)
    .map((p) => p.id);
  const squad = order.filter((id) => draft_.sel[id]);
  const starters = squad.filter((id) => draft_.sel[id] === 'start');
  const need = field + 1;
  if (starters.length !== need) return notify(t('errStarters', { need, field, n: starters.length }));
  const gkId = draft_.gkId;
  if (!gkId || !starters.includes(gkId)) return notify(t('errGk'));

  let g = draft_.id ? getGame(draft_.id) : undefined;
  if (!g) {
    // A new game: the rest of its fields are filled in just below.
    g = {
      id: uid(),
      status: 'scheduled',
      clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 },
      events: [],
      marks: [],
      alerted: {},
    } as unknown as Game;
    db.games.push(g);
  }
  const names: Record<string, SquadName> = {};
  for (const id of squad) {
    const p = db.players.find((x) => x.id === id);
    if (!p) continue;
    names[id] = { name: p.name, number: p.number, fullName: p.fullName || '' };
  }
  Object.assign(g, {
    date: draft_.date,
    time: draft_.time,
    opponent: draft_.opponent.trim(),
    formatId: draft_.formatId,
    field,
    periods,
    periodMin,
    maxExtra,
    squad,
    starters,
    gkId,
    names,
    teamId: team.id,
    club: team.club,
    team: team.name,
    home: draft_.home,
    round: round >= 1 ? String(round) : '',
  });
  g.formation = formationOf(g);
  g.lineup = startLineup(g);
  db.lastTeamId = team.id;
  save();
  location.hash = `#/game/${g.id}`;
}

export const gameEditActions = {
  sel: ({ id, v }: DOMStringMap) => {
    if (!draft || !id) return;
    if (v === 'start' || v === 'bench') draft.sel[id] = v;
    else delete draft.sel[id];
    if (v !== 'start' && draft.gkId === id) draft.gkId = null;
    rerender();
  },
  'set-gk': ({ id }: DOMStringMap) => {
    if (!draft) return;
    draft.gkId = id ?? null;
    rerender();
  },
  'set-home': ({ v }: DOMStringMap) => {
    if (!draft) return;
    draft.home = v === '1';
    rerender();
  },
  'save-game': () => saveGame(),
};

/** The new/edit game screen: screens and actions (app/ registers them at startup). */
export const gameEditPage = { views: { new: viewEdit, edit: viewEdit }, actions: gameEditActions };
