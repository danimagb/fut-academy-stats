// Live game actions that several screens share: the clock reminders and auto-stop, substitutions,
// moving players, the Undo button, and how an event is described.
import { addEvent, endPeriodAt } from '@/data/live';
import { save } from '@/data/save';
import { derive } from '@/data/queries';
import { route } from '@/shared/lib/route';
import { buzz } from '@/shared/lib/device';
import { toast } from '@/shared/ui/toast';
import { esc } from '@/shared/lib/html';
import { timeCheck } from '@/domain/clock';
import { canRecord, planMove } from '@/domain/game-state';
import { pname, squadName } from '@/domain/players';
import { periodName } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { rerender } from '@/shared/lib/rerender';
import type { Game, GameEvent, Mark } from '@/domain/types';

/** Undo button for a toast after logging an event. */
export const undoBtn = (eventId: string | null): string =>
  `<button data-action="undo-toast" data-id="${eventId ?? ''}">${t('undo')}</button>`;

// Reminders once regular time is up, and an automatic stop if the coach forgets.
export function checkTime(g: Game): void {
  const check = timeCheck(g, Date.now());
  if (check.kind === 'none') return;
  const p = check.period;
  const onThisGame = route().view === 'game' && route().id === g.id;
  const last = p >= g.periods;

  if (check.kind === 'auto-stop') {
    endPeriodAt(g, check.endT);
    g.autoStopped = p;
    save();
    navigator.vibrate?.([500, 200, 500]);
    if (onThisGame) {
      rerender();
      toast(
        t('autoStoppedToast', { p: periodName(g, p), m: g.maxExtra ?? 10 }),
        `<button data-action="fix-open">${t('fixTimes')}</button>`,
      );
    }
    return;
  }
  g.alerted[p] = check.n;
  save();
  navigator.vibrate?.([300, 150, 300]);
  if (onThisGame) {
    const msg =
      check.n === 0
        ? t('timeUp', { p: periodName(g, p) })
        : t('extraMin', { p: periodName(g, p), m: check.extraMin });
    toast(
      msg,
      `<button data-action="end-period">${last ? t('fullTime') : t('endPeriod', { p: periodName(g, p) })}</button>`,
    );
  }
}

// ---------- Pitch positions ----------
// A lineup is one id (or null) per slot: slot 0 is the goal, slots 1..field follow the
// formation from defence to attack, left to right. Changing formation keeps the slots.

// ---------- Game state (derived from events) ----------

export function doSub(g: Game, out: string, inn: string): void {
  if (!canRecord(g)) return;
  const id = addEvent(g, { type: 'sub', playerId: out, inId: inn });
  rerender();
  toast({ html: subLine(esc(pname(g, inn)), esc(pname(g, out))) }, undoBtn(id));
}

// Move a pitch player to a slot (swapping with whoever is there). Moving into or out of
// goal changes the goalkeeper. Before kick-off this just edits the starting lineup.
export function movePlayer(g: Game, id: string, slot: number): void {
  if (!canRecord(g)) return;
  const plan = planMove(g, derive(g), id, slot);
  if (plan.kind === 'none') return;
  if (plan.kind === 'lineup') {
    g.lineup = plan.lineup;
    g.gkId = plan.gkId;
    save();
    buzz();
    rerender();
    return;
  }
  const eid =
    plan.kind === 'gk'
      ? addEvent(g, { type: 'gk', playerId: plan.playerId })
      : addEvent(g, { type: 'pos', playerId: id, slot });
  rerender();
  toast(
    plan.kind === 'gk'
      ? t('inGoalToast', { p: squadName(g, plan.playerId).name })
      : t('posToast', { p: squadName(g, id).name }),
    undoBtn(eid),
  );
}

// Substitution line: green ▲ for the player coming on, red ▼ for the one going off.
// Names must already be escaped.
export const subLine = (inName: string, outName: string): string =>
  `<span class="nw"><span class="sub-in" aria-hidden="true">▲</span>${inName}</span> <span class="nw"><span class="sub-out" aria-hidden="true">▼</span>${outName}</span>`;

/** A timeline line for an event, or for a kick-off / end of a period. */
export function describe(g: Game, e: GameEvent | Mark): string {
  switch (e.type) {
    case 'sub':
      return subLine(esc(pname(g, e.inId)), esc(pname(g, e.playerId)));
    case 'goal':
      return t('evGoal', { p: esc(pname(g, e.playerId)) });
    case 'oppgoal':
      return t('evOppGoal');
    case 'yellow':
      return t('evYellow', { p: esc(pname(g, e.playerId)) });
    case 'red':
      return t('evRed', { p: esc(pname(g, e.playerId)) });
    case 'gk':
      return t('evGk', { p: esc(pname(g, e.playerId)) });
    case 'pos':
      return t('evPos', { p: esc(pname(g, e.playerId)) });
    case 'start':
      return t('evStart', { p: periodName(g, e.period) });
    case 'end':
      return t('evEnd', { p: periodName(g, e.period) });
  }
  return '';
}
