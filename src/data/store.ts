// The app's data on this phone: one localStorage key holding teams, players and games, with
// change tracking for cloud sync. The rest of the app edits `db` and calls `save()`.
//
// `db` is a live binding: importers always see the current object. `initStore()` loads it at
// startup and `setDb()` replaces it (restoring a backup).
import { checkShape, type Check } from '@/domain/validate';
import type { Db, RecordKind, Role, SyncState, Tombstone } from '@/domain/types';
import { uid } from '@/shared/lib/id';

export const STORE_KEY = 'fut-academy-stats.v1';
/** Records that failed the shape check when the store was loaded, kept here so nothing is lost. */
export const REJECTED_KEY = 'fut-academy-stats.rejected';

/** Synced record types (per-phone settings like db.formations and db.lastTeamId are not records). */
export const RECORD_KINDS: readonly RecordKind[] = ['teams', 'players', 'games'];

type AnyRecord = { id: string; teamId?: string; updatedAt?: number; dirty?: boolean } & Record<
  string,
  unknown
>;
const records = (data: Db, kind: RecordKind): AnyRecord[] => data[kind] as unknown as AnyRecord[];

/** A record dropped because it failed a check, with why. */
export type Rejected = { kind: RecordKind; record: unknown; problems: string[]; at: number };

// ---------- Load and normalize ----------

/**
 * Removes records that fail `check` from `data` (in place) and returns them.
 * Arrays that aren't arrays are treated as empty.
 */
export function dropInvalid(
  data: Record<string, unknown>,
  check: (kind: RecordKind, r: unknown) => Check,
  now: number,
): Rejected[] {
  const rejected: Rejected[] = [];
  for (const kind of RECORD_KINDS) {
    const list = Array.isArray(data[kind]) ? (data[kind] as unknown[]) : [];
    data[kind] = list.filter((r) => {
      const c = check(kind, r);
      if (!c.ok) rejected.push({ kind, record: r, problems: c.problems, at: now });
      return c.ok;
    });
  }
  return rejected;
}

/** Cloud sync bookkeeping, kept out of the records so it doesn't count as a change. */
export function emptySync(): SyncState {
  return { userId: null, lastPulledAt: null, lastSyncAt: null, teams: {}, clubs: {}, uploads: [] };
}

export function normalizeSync(s: unknown): SyncState {
  const sync: SyncState = {
    ...emptySync(),
    ...(s && typeof s === 'object' ? (s as Partial<SyncState>) : {}),
  };
  if (!sync.teams || typeof sync.teams !== 'object' || Array.isArray(sync.teams)) sync.teams = {};
  // Roles stored before clubs: 'director' / 'coach' (the next pull brings the real ones).
  const OLD: Record<string, Role> = { director: 'team_manager', coach: 'team_coach' };
  for (const [id, role] of Object.entries(sync.teams)) {
    const r = OLD[role] ?? role;
    if (r === 'club_manager' || r === 'team_manager' || r === 'team_coach') sync.teams[id] = r;
    else delete sync.teams[id];
  }
  if (!sync.clubs || typeof sync.clubs !== 'object' || Array.isArray(sync.clubs)) sync.clubs = {};
  if (!Array.isArray(sync.uploads)) sync.uploads = [];
  return sync;
}

/**
 * Games keep a copy of their team's club and name (used in titles, the report and the PDF).
 * Keep that copy in line with the team, so renaming a team updates its games too. Games whose
 * team was deleted keep the names they had.
 */
export function syncGameTeams(data: Pick<Db, 'games' | 'teams'>, teamId: string | null = null): void {
  for (const g of data.games) {
    if (teamId && g.teamId !== teamId) continue;
    const tm = data.teams.find((x) => x.id === g.teamId);
    if (tm) Object.assign(g, { club: tm.club, team: tm.name });
  }
}

/**
 * Brings stored or imported data up to the current shape. Players belong to a team: data from
 * before teams existed gets one team holding everyone. Records from before change tracking are
 * marked as changed so a first sync uploads them.
 */
export function normalize(input: Record<string, unknown>): Db {
  const data = input as unknown as Db;
  if (!Array.isArray(data.teams)) data.teams = [];
  data.sync = normalizeSync(data.sync);
  // Players of a cloud team are left alone (moving them would move them in the cloud too).
  const orphans = data.players.filter(
    (p) => !data.teams.some((tm) => tm.id === p.teamId) && !data.sync.teams[p.teamId],
  );
  if (orphans.length) {
    if (!data.teams.length) data.teams.push({ id: uid(), club: '', name: '' });
    for (const p of orphans) p.teamId = data.teams[0]!.id;
  }
  syncGameTeams(data);
  if (!Array.isArray(data.deleted)) data.deleted = [];
  for (const kind of RECORD_KINDS) {
    for (const r of records(data, kind)) {
      if (r.updatedAt == null) Object.assign(r, { updatedAt: 0, dirty: true });
    }
  }
  return data;
}

function keepRejected(rejected: readonly Rejected[]): void {
  if (!rejected.length) return;
  try {
    const before: unknown = JSON.parse(localStorage.getItem(REJECTED_KEY) || '[]');
    const list = Array.isArray(before) ? before : [];
    localStorage.setItem(REJECTED_KEY, JSON.stringify([...list, ...rejected]));
  } catch {
    // Storage full or unavailable: the records are still reported to the caller.
  }
}

/** Records the last load set aside (so the app can say so once). */
export let loadRejected: Rejected[] = [];

/** Reads the store from localStorage, dropping (and keeping aside) records that would crash the app. */
export function load(now = Date.now()): Db {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as Db).players) &&
      Array.isArray((data as Db).games)
    ) {
      loadRejected = dropInvalid(data as Record<string, unknown>, checkShape, now);
      keepRejected(loadRejected);
      return normalize(data as Record<string, unknown>);
    }
  } catch {
    // Unreadable store: start empty (as before).
  }
  return normalize({ players: [], games: [] });
}

// ---------- Change tracking ----------
// Every save compares each team, player and game with how it was at the last save. A record
// that changed gets `updatedAt` (ms) and `dirty: true` ("not uploaded yet"); a record that
// disappeared leaves a tombstone in `db.deleted`, so a later sync can delete it elsewhere.

/** A record as JSON without its tracking fields: equal keys mean no change. */
export const recordKey = ({ updatedAt: _u, dirty: _d, ...rest }: AnyRecord): string => JSON.stringify(rest);

/** A record's team (a team is its own team). */
export const teamIdOf = (kind: RecordKind, r: { id: string; teamId?: string }): string =>
  (kind === 'teams' ? r.id : r.teamId) ?? '';

/** Team of a record as it was at the last save (from its snapshot JSON). */
function savedTeamId(kind: RecordKind, id: string, key: string): string | null {
  if (kind === 'teams') return id;
  try {
    return (JSON.parse(key) as { teamId?: string }).teamId ?? null;
  } catch {
    return null;
  }
}

type Snapshot = Record<RecordKind, Map<string, string>>;

export function snapshotOf(data: Db): Snapshot {
  return Object.fromEntries(
    RECORD_KINDS.map((kind) => [kind, new Map(records(data, kind).map((r) => [r.id, recordKey(r)]))]),
  ) as Snapshot;
}

/** The store. Empty until `initStore()` (called once at startup) loads it. */
export let db: Db = normalize({ players: [], games: [] });
let saved: Snapshot = snapshotOf(db);

/** Loads the store from localStorage (once, at startup; tests call it to start afresh). */
export function initStore(now = Date.now()): Db {
  db = load(now);
  saved = snapshotOf(db);
  return db;
}

/** Replaces the whole store (restoring a backup). Call `save()` after. */
export function setDb(next: Db): void {
  db = next;
}

/** A team is a cloud team iff the sync state lists it. */
export const isCloudTeam = (teamId: string | null | undefined): boolean =>
  !!(teamId && db.sync.teams[teamId]);

/** Marks changed records and leaves tombstones for removed ones, compared with the last save. */
export function trackChanges(now = Date.now()): void {
  const next = snapshotOf(db);
  for (const kind of RECORD_KINDS) {
    const before = saved[kind];
    const after = next[kind];
    const gone: Tombstone[] = [];
    for (const r of records(db, kind)) {
      const prev = before.get(r.id);
      if (prev === after.get(r.id)) continue;
      Object.assign(r, { updatedAt: now, dirty: true });
      // Moved from a cloud team to a team on this phone (a game's team was changed): delete it
      // from the cloud team. `moved` tombstones stay while the record is still local.
      // (teamIdOf, not r.teamId: a team record is its own team, so editing one never "moves" it.)
      const oldTeam = prev ? savedTeamId(kind, r.id, prev) : null;
      const newTeam = teamIdOf(kind, r);
      if (oldTeam && oldTeam !== newTeam && isCloudTeam(oldTeam) && !isCloudTeam(newTeam)) {
        gone.push({ kind, id: r.id, teamId: oldTeam, deletedAt: now, moved: true });
      }
    }
    // Tombstones remember the record's team, so sync knows whether (and where) to send them.
    for (const [id, key] of before) {
      if (!after.has(id)) gone.push({ kind, id, teamId: savedTeamId(kind, id, key), deletedAt: now });
    }
    // A record that is back (e.g. restored from a backup) is no longer deleted.
    const recs = new Map(records(db, kind).map((r) => [r.id, r]));
    db.deleted = db.deleted.filter((d) => {
      const rec = recs.get(d.id);
      return d.kind !== kind || !rec || (d.moved && !isCloudTeam(teamIdOf(kind, rec)));
    });
    db.deleted.push(...gone);
  }
  saved = next;
}

function write(): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

/** Saves the store, counting what changed since the last save (see trackChanges). */
export function saveStore(now = Date.now()): void {
  trackChanges(now);
  write();
}

/**
 * Writes the store without counting anything as a change: for data that came from (or was
 * cleaned up for) the cloud, and for clearing `dirty` after an upload.
 */
export function saveQuiet(): void {
  write();
  saved = snapshotOf(db);
}
