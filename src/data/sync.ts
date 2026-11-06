// Cloud sync engine.
// Local-first: the app keeps reading and writing `db` + save(). In the background, sync
// uploads the changes of cloud teams (push), then downloads what changed in the cloud (pull).
// Only cloud teams (in db.sync.teams) and their players and games are synced; teams on this
// phone never leave it. Failures only show in the quiet status line on Profile.
//  * push (what this user may write: see canPush): upsert `dirty` records, then soft-delete the
//    records in `db.deleted` (deleted_at). `dirty` is cleared only if the record didn't change
//    while it was being sent.
//  * pull: this user's teams and roles first (my_teams(); teams this user lost leave the
//    phone) and their clubs, then rows changed since the last pull (with some overlap). Local
//    changes not uploaded yet win over the cloud where this user may write them; elsewhere the
//    cloud always wins. Rows that fail checkIncoming() are left out.
//  * Last write wins per record (a live game logged on two phones at once overwrites itself).
//
// The engine knows nothing about screens: the app passes in the client and what to do on
// status changes and new data (configureSync), so this module never imports upwards.
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Game, Player, RecordKind, Role, SyncClub, Team, Tombstone } from '@/domain/types';
import { checkIncoming } from '@/domain/validate';
import { t } from '@/shared/i18n/i18n';
import { RECORD_KINDS, db, emptySync, isCloudTeam, recordKey, saveQuiet, teamIdOf } from './store';

type SyncRecord = Team | Player | Game;
/** The records of one kind, as one list type (the code below treats the kinds alike). */
const list = (kind: RecordKind): SyncRecord[] => db[kind];
const setList = (kind: RecordKind, records: SyncRecord[]): void => {
  (db as Record<RecordKind, SyncRecord[]>)[kind] = records;
};

/** Rows as the database sends them (the columns in COLUMNS). */
type Deleted = { updated_at: string; deleted_at: string | null };
type TeamRow = Deleted & { id: string; club_id: string | null; club: string | null; name: string | null };
type PlayerRow = Deleted & {
  id: string;
  team_id: string;
  number: string | null;
  name: string | null;
  full_name: string | null;
};
type GameRow = Deleted & { id: string; team_id: string; data: Omit<Game, 'id' | 'teamId'> };
type AnyRow = (TeamRow | PlayerRow | GameRow) & { team_id?: string };

export type SyncHooks = {
  client: SupabaseClient | null;
  canSync: () => boolean;
  userId: () => string | null;
  request: () => void;
  onStatus: () => void;
  onChange: () => void;
  onRejected: (n: number) => void;
  afterSync: (info: { firstOk: boolean }) => void;
};

const noop = (): void => {};
const hooks: SyncHooks = {
  client: null,
  canSync: () => false,
  userId: () => null,
  request: noop,
  onStatus: noop,
  onChange: noop,
  onRejected: noop,
  afterSync: noop,
};

/**
 * Connects the engine to the app: the Supabase client, whether syncing is possible now, the
 * signed-in user's id, how to start a sync (with any account checks), and what to do on status
 * changes (`onStatus`), new data (`onChange`), records left out (`onRejected(n)`) and after
 * each sync (`afterSync({ firstOk })`).
 */
export function configureSync(next: Partial<SyncHooks>): void {
  Object.assign(hooks, next);
}

const PAGE = 1000;
const PUSH_BATCH = 100;
const PULL_OVERLAP_MS = 10000; // rows can commit with a slightly older updated_at
const COLUMNS: Record<RecordKind, string> = {
  teams: 'id, club_id, club, name, updated_at, deleted_at',
  players: 'id, team_id, number, name, full_name, updated_at, deleted_at',
  games: 'id, team_id, data, updated_at, deleted_at',
};
const validDate = (s: unknown): string | null =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
// App record -> database row. deleted_at: null, so uploading a record again undeletes it.
export const toRow = {
  // club is set by the server from the club's name; club_id is required for a cloud team.
  teams: (r: Team) => ({
    id: r.id,
    club_id: r.clubId ?? null,
    club: r.club || '',
    name: r.name || '',
    deleted_at: null,
  }),
  players: (r: Player) => ({
    id: r.id,
    team_id: r.teamId,
    number: String(r.number ?? ''),
    name: r.name || '',
    full_name: r.fullName || '',
    deleted_at: null,
  }),
  games: ({ updatedAt: _u, dirty: _d, ...g }: Game) => ({
    id: g.id,
    team_id: g.teamId,
    date: validDate(g.date),
    status: g.status ?? null,
    data: g,
    deleted_at: null,
  }),
};
// Database row -> app record (the app stores shirt numbers as text too).
export const fromRow = {
  teams: (row: TeamRow): Team => ({
    id: row.id,
    club: row.club ?? '',
    name: row.name ?? '',
    ...(row.club_id ? { clubId: row.club_id } : {}),
  }),
  players: (row: PlayerRow): Player => ({
    id: row.id,
    teamId: row.team_id,
    number: row.number ?? '',
    name: row.name ?? '',
    fullName: row.full_name ?? '',
  }),
  games: (row: GameRow): Game => ({ ...row.data, id: row.id, teamId: row.team_id }),
};
/** One row of `kind` from the database, as an app record. */
const recordFromRow = (kind: RecordKind, row: AnyRow): SyncRecord =>
  kind === 'teams'
    ? fromRow.teams(row as TeamRow)
    : kind === 'players'
      ? fromRow.players(row as PlayerRow)
      : fromRow.games(row as GameRow);
/** One app record as a row for `kind`'s table. */
const rowFromRecord = (kind: RecordKind, r: SyncRecord): Record<string, unknown> =>
  kind === 'teams'
    ? toRow.teams(r as Team)
    : kind === 'players'
      ? toRow.players(r as Player)
      : toRow.games(r as Game);

// Key-order-independent JSON (jsonb doesn't keep key order), without the sync fields.
const canon = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
};
export const sameRecord = (a: object, b: object): boolean =>
  canon({ ...a, updatedAt: undefined, dirty: undefined }) ===
  canon({ ...b, updatedAt: undefined, dirty: undefined });

export const roleOf = (teamId: string | null | undefined): Role | null =>
  (teamId && db.sync.teams[teamId]) || null;
export const localTeams = (): Team[] => db.teams.filter((tm) => !isCloudTeam(tm.id));
const ROLES: readonly Role[] = ['club_manager', 'team_manager', 'team_coach'];
/**
 * What a role may write in a cloud team (the database checks it too): club managers everything;
 * team managers the players and games, not the team itself; team coaches nothing.
 */
export const roleCanWrite = (role: Role | null | undefined, kind: RecordKind): boolean =>
  role === 'club_manager' || (role === 'team_manager' && kind !== 'teams');
const canPush = (kind: RecordKind, teamId: string | null | undefined): boolean =>
  roleCanWrite(roleOf(teamId), kind);
const pushable = (kind: RecordKind, r: SyncRecord): boolean => !!r.dirty && canPush(kind, teamIdOf(kind, r));
export const hasCloudChanges = (): boolean =>
  RECORD_KINDS.some((kind) => list(kind).some((r) => r.dirty && isCloudTeam(teamIdOf(kind, r)))) ||
  db.deleted.some((d) => isCloudTeam(d.teamId));
// Changes this phone still has to upload.
export const pendingCount = (): number =>
  RECORD_KINDS.reduce((n, kind) => n + list(kind).filter((r) => pushable(kind, r)).length, 0) +
  db.deleted.filter((d) => canPush(d.kind, d.teamId)).length;

export type SyncStatus = 'idle' | 'running' | 'ok' | 'offline' | 'failed';
export const syncState: { status: SyncStatus; error: string } = { status: 'idle', error: '' };
export const forceFull = new Set<string>(); // teams to download in full on the next pull (role changed, refused)
let syncRun: Promise<void> | null = null;
let syncAgain = false;
let syncEpoch = 0; // bumped when the cloud data is removed, so a sync in flight drops its results
let syncTimer: ReturnType<typeof setTimeout> | undefined;
let firstSync = false; // the first sync for this user on this phone (then: offer to upload teams)

/** What Supabase returns as an error (PostgrestError, or anything with a message). */
type ErrorLike = Partial<Pick<PostgrestError, 'message' | 'code'>> & { status?: number };

export class SyncError extends Error {
  code: string | undefined;
  status: number | undefined;
  constructor(error: ErrorLike | string | null | undefined, status?: number) {
    const e = typeof error === 'object' ? error : null;
    super(e?.message || String(error));
    this.code = e?.code;
    this.status = status ?? e?.status;
  }
}
export const isOffline = (e: unknown): boolean => {
  const err = e as { status?: number; message?: string } | null | undefined;
  return err?.status === 0 || !navigator.onLine || /fetch|network/i.test(err?.message || '');
};
const ABORTED = new Error('sync aborted');
const checkEpoch = (epoch: number): void => {
  if (epoch !== syncEpoch) throw ABORTED;
};

// Remove teams (and their players, games and pending deletes) from this phone, without
// leaving tombstones: they are only gone from here, not from the cloud.
export function removeTeamsLocally(ids: readonly string[]): void {
  const gone = new Set(ids);
  for (const kind of RECORD_KINDS)
    setList(
      kind,
      list(kind).filter((r) => !gone.has(teamIdOf(kind, r))),
    );
  db.deleted = db.deleted.filter((d) => !d.teamId || !gone.has(d.teamId));
  for (const id of gone) delete db.sync.teams[id];
  db.sync.uploads = db.sync.uploads.filter((id) => !gone.has(id));
}

// Signing out or another user signing in: cloud teams leave the phone, local teams stay.
export function removeCloudData(): void {
  syncEpoch++;
  clearTimeout(syncTimer);
  forceFull.clear();
  removeTeamsLocally(Object.keys(db.sync.teams));
  db.sync = emptySync();
  Object.assign(syncState, { status: 'idle', error: '' });
  saveQuiet();
  hooks.onChange();
}

export function scheduleSync(ms = 3000): void {
  clearTimeout(syncTimer);
  if (hooks.canSync()) syncTimer = setTimeout(hooks.request, ms);
}

// Single flight: a call while a sync runs makes it run once more afterwards.
export function runSync(): Promise<void> {
  if (!hooks.canSync()) return Promise.resolve();
  if (syncRun) {
    syncAgain = true;
    return syncRun;
  }
  syncRun = (async () => {
    do {
      syncAgain = false;
      await syncOnce();
    } while (syncAgain && hooks.canSync());
  })().finally(() => {
    syncRun = null;
  });
  return syncRun;
}

/** The Supabase client; syncing only runs when canSync() says there is one. */
function client(): SupabaseClient {
  if (!hooks.client) throw new SyncError('no Supabase client');
  return hooks.client;
}

async function syncOnce(): Promise<void> {
  clearTimeout(syncTimer);
  const userId = hooks.userId();
  if (db.sync.userId && db.sync.userId !== userId) removeCloudData(); // another person, same phone
  const first = !db.sync.userId;
  if (first) {
    db.sync.userId = userId;
    saveQuiet();
    firstSync = true;
  }
  const epoch = syncEpoch;
  Object.assign(syncState, { status: 'running' });
  hooks.onStatus();
  try {
    const pushed = await push(epoch);
    await pull(epoch);
    db.sync.lastSyncAt = Date.now();
    syncState.status = pushed ? 'ok' : 'failed';
  } catch (e) {
    if (e === ABORTED) return;
    syncState.status = isOffline(e) ? 'offline' : 'failed';
    console.warn('Sync failed', e);
  } finally {
    if (epoch === syncEpoch) saveQuiet();
    hooks.onStatus();
  }
  const wasFirst = firstSync && syncState.status === 'ok';
  if (wasFirst) firstSync = false;
  hooks.afterSync({ firstOk: wasFirst });
}

// Returns false if some upload failed for a reason other than the network (it's retried later).
async function push(epoch: number): Promise<boolean> {
  const refused = new Set<string>(); // teams the server refused this time
  let ok = true;
  for (const kind of RECORD_KINDS) {
    const byTeam = new Map<string, SyncRecord[]>();
    for (const r of list(kind)) {
      if (!pushable(kind, r)) continue;
      const tid = teamIdOf(kind, r);
      const recs = byTeam.get(tid) ?? [];
      recs.push(r);
      byTeam.set(tid, recs);
    }
    for (const [tid, recs] of byTeam) {
      for (let i = 0; i < recs.length && !refused.has(tid); i += PUSH_BATCH) {
        const batch = recs.slice(i, i + PUSH_BATCH);
        const keys = batch.map(recordKey);
        const { error, status } = await client()
          .from(kind)
          .upsert(
            batch.map((r) => rowFromRecord(kind, r)),
            { onConflict: 'id' },
          );
        checkEpoch(epoch);
        if (error) {
          const e = new SyncError(error, status);
          if (isOffline(e)) throw e;
          refused.add(tid);
          if (e.code === '42501') pushRefused(tid);
          else ok = false;
          console.warn('Sync: upload refused', kind, tid, e);
          continue;
        }
        // Edits made while the request was on its way stay dirty for the next push.
        batch.forEach((r, j) => {
          if (recordKey(r) === keys[j]) r.dirty = false;
        });
        if (kind === 'teams') db.sync.uploads = db.sync.uploads.filter((id) => id !== tid);
        saveQuiet();
      }
    }
  }

  // Deletes. Those of teams on this phone (or that this user may not delete) are never sent.
  const toSend: Tombstone[] = [];
  for (const d of db.deleted) {
    if (canPush(d.kind, d.teamId) && !refused.has(d.teamId ?? '')) toSend.push(d);
    else if (roleOf(d.teamId) && d.teamId) forceFull.add(d.teamId); // get the deleted record back
  }
  db.deleted = db.deleted.filter(
    (d) => toSend.includes(d) || (refused.has(d.teamId ?? '') && canPush(d.kind, d.teamId)),
  );
  for (const kind of RECORD_KINDS) {
    const ds = toSend.filter((d) => d.kind === kind);
    for (let i = 0; i < ds.length; i += PUSH_BATCH) {
      const batch = ds.slice(i, i + PUSH_BATCH);
      const { error, status } = await client()
        .from(kind)
        .update({ deleted_at: new Date().toISOString() })
        .in(
          'id',
          batch.map((d) => d.id),
        );
      checkEpoch(epoch);
      if (error) throw new SyncError(error, status);
      db.deleted = db.deleted.filter((d) => !batch.includes(d));
      saveQuiet();
    }
  }
  return ok;
}

// The server refused an upload for a team (RLS, error 42501). A team being uploaded wasn't
// allowed (e.g. its id belongs to someone else's team): it goes back to being a local team.
// Otherwise this user probably lost the right to write: drop the changes so the cloud wins,
// and download the team in full on the pull that follows (which also refreshes the role).
function pushRefused(tid: string): void {
  if (db.sync.uploads.includes(tid)) {
    delete db.sync.teams[tid];
    db.sync.uploads = db.sync.uploads.filter((id) => id !== tid);
    syncState.error = t('syncUploadFailed');
  } else {
    for (const kind of RECORD_KINDS)
      for (const r of list(kind)) if (teamIdOf(kind, r) === tid) r.dirty = false;
    db.deleted = db.deleted.filter((d) => d.teamId !== tid);
    forceFull.add(tid);
  }
  saveQuiet();
  hooks.onChange();
}

// All rows of `kind` for these teams, changed after `since` (all rows when null), oldest first.
async function fetchRows(
  kind: RecordKind,
  teamIds: string[],
  since: string | null,
  epoch: number,
): Promise<AnyRow[]> {
  if (!teamIds.length) return [];
  const rows: AnyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = client()
      .from(kind)
      .select(COLUMNS[kind])
      .in(kind === 'teams' ? 'id' : 'team_id', teamIds);
    if (since) q = q.gt('updated_at', since);
    const { data, error, status } = await q
      .order('updated_at')
      .order('id')
      .range(from, from + PAGE - 1);
    checkEpoch(epoch);
    if (error) throw new SyncError(error, status);
    const page = (data ?? []) as unknown as AnyRow[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function pull(epoch: number): Promise<void> {
  const mine = await client().rpc('my_teams');
  checkEpoch(epoch);
  if (mine.error) throw new SyncError(mine.error, mine.status);
  const prev = db.sync.teams;
  const teams: Record<string, Role> = {};
  for (const m of (mine.data ?? []) as { team_id: string; role: string }[])
    if ((ROLES as readonly string[]).includes(m.role)) teams[m.team_id] = m.role as Role;
  // The clubs this user can see (few rows: always all of them).
  const clubRows = await client()
    .from('clubs')
    .select('id, name, short_name')
    .order('id')
    .range(0, PAGE - 1);
  checkEpoch(epoch);
  if (clubRows.error) throw new SyncError(clubRows.error, clubRows.status);
  const clubs: Record<string, SyncClub> = {};
  for (const c of (clubRows.data ?? []) as { id: string; name: string; short_name: string | null }[])
    if (typeof c.id === 'string' && typeof c.name === 'string')
      clubs[c.id] = { name: c.name, shortName: c.short_name ?? '' };
  // Teams still being uploaded aren't in the cloud yet: keep them.
  for (const id of db.sync.uploads) if (prev[id] && !teams[id]) teams[id] = prev[id];
  const ids = Object.keys(teams);
  // Download in full: new teams, teams whose role changed, refused ones, and teams with local
  // edits this user may not upload (so the cloud version comes back).
  const full = new Set(
    ids.filter(
      (id) =>
        !prev[id] ||
        prev[id] !== teams[id] ||
        forceFull.has(id) ||
        RECORD_KINDS.some(
          (kind) =>
            !roleCanWrite(teams[id], kind) && list(kind).some((r) => r.dirty && teamIdOf(kind, r) === id),
        ),
    ),
  );
  const since = db.sync.lastPulledAt
    ? new Date(Date.parse(db.sync.lastPulledAt) - PULL_OVERLAP_MS).toISOString()
    : null;
  const rows = {} as Record<RecordKind, AnyRow[]>;
  for (const kind of RECORD_KINDS) {
    rows[kind] = [
      ...(await fetchRows(
        kind,
        ids.filter((id) => !full.has(id)),
        since,
        epoch,
      )),
      ...(await fetchRows(kind, [...full], null, epoch)),
    ];
  }

  // Everything is downloaded: apply it in one go (no awaits from here on).
  let changed = false;
  const removed = Object.keys(prev).filter((id) => !teams[id]);
  if (removed.length) {
    // Removed from these teams. Changes not uploaded yet for them are lost (a director removed
    // while offline with pending edits).
    removeTeamsLocally(removed);
    changed = true;
  }
  if (ids.some((id) => prev[id] !== teams[id])) changed = true;
  if (!sameRecord(db.sync.clubs, clubs)) changed = true;
  db.sync.teams = teams;
  db.sync.clubs = clubs;
  for (const id of full) forceFull.delete(id);

  let latest = db.sync.lastPulledAt;
  let rejectedRows = 0;
  for (const kind of RECORD_KINDS) {
    const records = list(kind);
    const index = new Map(records.map((r, i) => [r.id, i]));
    const seen = new Set<string>();
    const drop = new Set<string>();
    for (const row of rows[kind]) {
      if (!latest || Date.parse(row.updated_at) > Date.parse(latest)) latest = row.updated_at;
      const tid = kind === 'teams' ? row.id : row.team_id;
      if (!tid || !teams[tid]) continue;
      seen.add(row.id);
      const i = index.get(row.id);
      const local = i == null ? null : records[i];
      // A record moved to a team on this phone is no longer the cloud's.
      if (local && !isCloudTeam(teamIdOf(kind, local))) continue;
      if (row.deleted_at) {
        if (local) drop.add(row.id);
        // A deleted team takes its (normally already deleted) players with it.
        if (kind === 'teams') db.players = db.players.filter((p) => p.teamId !== row.id);
        continue;
      }
      if (local?.dirty && roleCanWrite(teams[teamIdOf(kind, local)], kind)) continue; // will be uploaded
      const rec = { ...recordFromRow(kind, row), updatedAt: Date.parse(row.updated_at), dirty: false };
      // Never trust what comes from the cloud: a damaged or implausible record is left out.
      const check = checkIncoming(kind, rec);
      if (!check.ok) {
        console.warn(`Sync: ${kind} ${row.id} left out:`, check.problems);
        rejectedRows++;
        continue;
      }
      if (local && sameRecord(local, rec)) {
        Object.assign(local, { dirty: false, updatedAt: rec.updatedAt });
        continue;
      }
      if (local && i != null) records[i] = rec;
      else {
        index.set(rec.id, records.length);
        records.push(rec);
      }
      changed = true;
    }
    // Teams downloaded in full: what the cloud doesn't have isn't theirs (except changes this
    // user may write and hasn't uploaded yet).
    for (const r of records) {
      const tid = teamIdOf(kind, r);
      if (full.has(tid) && !seen.has(r.id) && !(r.dirty && roleCanWrite(teams[tid], kind))) drop.add(r.id);
    }
    if (drop.size) {
      setList(
        kind,
        records.filter((r) => !drop.has(r.id)),
      );
      changed = true;
    }
  }
  db.sync.lastPulledAt = latest;
  saveQuiet();
  if (changed) hooks.onChange();
  if (rejectedRows) hooks.onRejected(rejectedRows);
}
