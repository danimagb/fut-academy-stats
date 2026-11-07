// Checks on data that comes into the app: a backup file, a cloud download, or what is stored on
// the phone. Row Level Security only decides *who* may write a team's records, not *what* they
// contain, so nothing that arrives is trusted (see docs/standards/data-and-sync.md).
//
// Two levels:
// - shape: the record has what the app needs not to crash (ids, arrays, objects). Applied to
//   everything, including the phone's own storage.
// - sanity: the values make sense (known event types, times within the game, players in the
//   squad, sensible text lengths). Applied on top of shape to data from outside (backups,
//   cloud). The limits are generous so real data is never rejected.
import type { Game, GameEventType, GameStatus, InstallPlatform, Player, RecordKind, Team } from './types';

export type Check = { ok: boolean; problems: string[] };

const STATUSES: readonly GameStatus[] = ['scheduled', 'live', 'break', 'finished'];
const EVENT_TYPES: readonly GameEventType[] = ['sub', 'goal', 'yellow', 'red', 'gk', 'pos', 'oppgoal'];
const MAX_TEXT = 500;
const MAX_EVENTS = 5000;
const MINUTE = 60_000;

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isText = (x: unknown): boolean =>
  x == null || ((typeof x === 'string' || isNum(x)) && String(x).length <= MAX_TEXT);

// Data from before teams existed has no teamId (the store's normalize step assigns one).
const optionalTeamId = (x: unknown): boolean => x == null || (typeof x === 'string' && x.length <= 100);

function result(problems: string[]): Check {
  return { ok: problems.length === 0, problems };
}

// ---------- Shape ----------

export function teamShape(r: unknown): Check {
  if (!isObj(r)) return result(['not an object']);
  return result(isId(r.id) ? [] : ['id']);
}

export function playerShape(r: unknown): Check {
  if (!isObj(r)) return result(['not an object']);
  const p: string[] = [];
  if (!isId(r.id)) p.push('id');
  if (!optionalTeamId(r.teamId)) p.push('teamId');
  return result(p);
}

export function gameShape(r: unknown): Check {
  if (!isObj(r)) return result(['not an object']);
  const p: string[] = [];
  if (!isId(r.id)) p.push('id');
  if (!optionalTeamId(r.teamId)) p.push('teamId');
  for (const k of ['events', 'squad', 'starters'] as const) if (!Array.isArray(r[k])) p.push(k);
  if (r.marks != null && !Array.isArray(r.marks)) p.push('marks');
  if (!isObj(r.clock)) p.push('clock');
  if (!isObj(r.names)) p.push('names');
  if (Array.isArray(r.events) && !r.events.every(isObj)) p.push('events: not objects');
  return result(p);
}

const SHAPES: Record<RecordKind, (r: unknown) => Check> = {
  teams: teamShape,
  players: playerShape,
  games: gameShape,
};

// ---------- Sanity (data from outside) ----------

export function teamSanity(r: Team): Check {
  const p: string[] = [];
  for (const k of ['club', 'name'] as const) if (!isText(r[k])) p.push(k);
  if (r.clubId !== undefined && !isId(r.clubId)) p.push('clubId');
  return result(p);
}

export function playerSanity(r: Player): Check {
  const p: string[] = [];
  for (const k of ['number', 'name', 'fullName'] as const) if (!isText(r[k])) p.push(k);
  return result(p);
}

/** Latest match time an event can have: every period at its regular length plus the auto-stop limit, and an hour to spare. */
export function maxMatchTime(g: Pick<Game, 'periods' | 'periodMin' | 'maxExtra'>): number {
  const periods = isNum(g.periods) && g.periods > 0 ? g.periods : 1;
  const periodMin = isNum(g.periodMin) && g.periodMin > 0 ? g.periodMin : 0;
  const extra = isNum(g.maxExtra) ? g.maxExtra : 10;
  return (periods * (periodMin + extra) + 60) * MINUTE;
}

export function gameSanity(g: Game): Check {
  const p: string[] = [];
  if (!STATUSES.includes(g.status)) p.push(`status ${String(g.status)}`);
  if (!(isNum(g.periods) && g.periods >= 1 && g.periods <= 12)) p.push('periods');
  if (!(isNum(g.periodMin) && g.periodMin >= 1 && g.periodMin <= 120)) p.push('periodMin');
  if (!(isNum(g.field) && g.field >= 1 && g.field <= 20)) p.push('field');
  for (const k of ['opponent', 'round', 'club', 'team', 'date', 'time', 'formatId', 'formation'] as const)
    if (!isText(g[k])) p.push(k);

  const squad = new Set(g.squad);
  if (!g.squad.every(isId)) p.push('squad');
  if (!g.starters.every((id) => squad.has(id))) p.push('starters not in squad');
  for (const [id, n] of Object.entries(g.names)) {
    if (!isObj(n) || !isText(n.name) || !isText(n.number) || !isText(n.fullName)) p.push(`names.${id}`);
  }

  if (g.owner !== undefined) {
    const o = g.owner as unknown;
    if (!isObj(o) || !isId(o.userId) || !isId(o.deviceId) || !isText(o.email)) p.push('owner');
  }

  const maxT = maxMatchTime(g);
  const timeOk = (t: unknown) => isNum(t) && t >= 0 && t <= maxT;
  if (g.events.length > MAX_EVENTS) p.push('too many events');
  for (const e of g.events) {
    const where = `event ${String(e.id)}`;
    if (!isId(e.id)) p.push(`${where}: id`);
    if (!EVENT_TYPES.includes(e.type)) {
      p.push(`${where}: type ${String(e.type)}`);
      continue;
    }
    if (!timeOk(e.t)) p.push(`${where}: time`);
    if (e.type !== 'oppgoal' && !squad.has(e.playerId)) p.push(`${where}: player not in squad`);
    if (e.type === 'sub' && !squad.has(e.inId)) p.push(`${where}: player coming on not in squad`);
    if (e.type === 'pos' && !(Number.isInteger(e.slot) && e.slot >= 0 && e.slot <= 20))
      p.push(`${where}: slot`);
  }
  for (const m of g.marks ?? []) {
    if (!isObj(m) || (m.type !== 'start' && m.type !== 'end') || !timeOk(m.t) || !isNum(m.period))
      p.push('mark');
  }
  const c = g.clock;
  if (!isNum(c.elapsedMs) || c.elapsedMs < 0 || c.elapsedMs > maxT || !isNum(c.period)) p.push('clock');
  return result(p);
}

/** Shape only: what the app needs not to crash. */
export function checkShape(kind: RecordKind, r: unknown): Check {
  return SHAPES[kind](r);
}

/** Shape, then sanity: for data from a backup file or the cloud. */
export function checkIncoming(kind: RecordKind, r: unknown): Check {
  const shape = checkShape(kind, r);
  if (!shape.ok) return shape;
  if (kind === 'teams') return teamSanity(r as Team);
  if (kind === 'players') return playerSanity(r as Player);
  return gameSanity(r as Game);
}

const INSTALL_PLATFORMS: readonly InstallPlatform[] = ['ios', 'android', 'desktop'];

/** The platforms a list says the app is installed on (account metadata or the phone), ignoring anything else. */
export function installPlatforms(x: unknown): InstallPlatform[] {
  if (!Array.isArray(x)) return [];
  return INSTALL_PLATFORMS.filter((p) => x.includes(p));
}
