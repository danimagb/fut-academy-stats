// @ts-nocheck -- moved unchanged apart from the hooks; typed in step 8 (strict TypeScript).
// Cloud sync engine.
// Local-first: the app keeps reading and writing `db` + save(). In the background, sync
// uploads the changes of cloud teams (push), then downloads what changed in the cloud (pull).
// Only cloud teams (in db.sync.teams) and their players and games are synced; teams on this
// phone never leave it. Failures only show in the quiet status line on Profile.
//  * push (teams where this user is director): upsert `dirty` records, then soft-delete the
//    records in `db.deleted` (deleted_at). `dirty` is cleared only if the record didn't change
//    while it was being sent.
//  * pull: memberships first (teams this user was removed from leave the phone), then rows
//    changed since the last pull (with some overlap). Local changes not uploaded yet win over
//    the cloud for directors; for coaches the cloud always wins. Rows that fail
//    checkIncoming() are left out.
//  * Last write wins per record (a live game logged on two phones at once overwrites itself).
//
// The engine knows nothing about screens: the app passes in the client and what to do on
// status changes and new data (configureSync), so this module never imports upwards.
import { checkIncoming } from '@/domain/validate';
import { t } from '@/shared/i18n/i18n';
import { RECORD_KINDS, db, emptySync, isCloudTeam, recordKey, saveQuiet, teamIdOf } from './store';

const noop = () => {};
const hooks = {
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
export function configureSync(next) {
  Object.assign(hooks, next);
}

const PAGE = 1000;
const PUSH_BATCH = 100;
const PULL_OVERLAP_MS = 10000; // rows can commit with a slightly older updated_at
const COLUMNS = {
  teams: 'id, club, name, updated_at, deleted_at',
  players: 'id, team_id, number, name, full_name, updated_at, deleted_at',
  games: 'id, team_id, data, updated_at, deleted_at',
};
const validDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
// App record -> database row. deleted_at: null, so uploading a record again undeletes it.
export const toRow = {
  teams: (r) => ({ id: r.id, club: r.club || '', name: r.name || '', deleted_at: null }),
  players: (r) => ({
    id: r.id,
    team_id: r.teamId,
    number: String(r.number ?? ''),
    name: r.name || '',
    full_name: r.fullName || '',
    deleted_at: null,
  }),
  games: ({ updatedAt, dirty, ...g }) => ({
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
  teams: (row) => ({ id: row.id, club: row.club ?? '', name: row.name ?? '' }),
  players: (row) => ({
    id: row.id,
    teamId: row.team_id,
    number: row.number ?? '',
    name: row.name ?? '',
    fullName: row.full_name ?? '',
  }),
  games: (row) => ({ ...row.data, id: row.id, teamId: row.team_id }),
};
// Key-order-independent JSON (jsonb doesn't keep key order), without the sync fields.
const canon = (v) =>
  Array.isArray(v)
    ? `[${v.map(canon).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .filter((k) => v[k] !== undefined)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
export const sameRecord = (a, b) =>
  canon({ ...a, updatedAt: undefined, dirty: undefined }) ===
  canon({ ...b, updatedAt: undefined, dirty: undefined });

export const roleOf = (teamId) => db.sync.teams[teamId] || null;
export const localTeams = () => db.teams.filter((tm) => !isCloudTeam(tm.id));
const pushable = (kind, r) => r.dirty && roleOf(teamIdOf(kind, r)) === 'director';
export const hasCloudChanges = () =>
  RECORD_KINDS.some((kind) => db[kind].some((r) => r.dirty && isCloudTeam(teamIdOf(kind, r)))) ||
  db.deleted.some((d) => isCloudTeam(d.teamId));
// Changes this phone still has to upload.
export const pendingCount = () =>
  RECORD_KINDS.reduce((n, kind) => n + db[kind].filter((r) => pushable(kind, r)).length, 0) +
  db.deleted.filter((d) => roleOf(d.teamId) === 'director').length;

export const syncState = { status: 'idle', error: '' }; // status: idle | running | ok | offline | failed
export const forceFull = new Set(); // teams to download in full on the next pull (role changed, refused)
let syncRun = null;
let syncAgain = false;
let syncEpoch = 0; // bumped when the cloud data is removed, so a sync in flight drops its results
let syncTimer = null;
let firstSync = false; // the first sync for this user on this phone (then: offer to upload teams)

export class SyncError extends Error {
  constructor(error, status) {
    super(error?.message || String(error));
    this.code = error?.code;
    this.status = status ?? error?.status;
  }
}
export const isOffline = (e) =>
  e?.status === 0 || !navigator.onLine || /fetch|network/i.test(e?.message || '');
const ABORTED = new Error('sync aborted');
const checkEpoch = (epoch) => {
  if (epoch !== syncEpoch) throw ABORTED;
};

// Remove teams (and their players, games and pending deletes) from this phone, without
// leaving tombstones: they are only gone from here, not from the cloud.
export function removeTeamsLocally(ids) {
  const gone = new Set(ids);
  for (const kind of RECORD_KINDS) db[kind] = db[kind].filter((r) => !gone.has(teamIdOf(kind, r)));
  db.deleted = db.deleted.filter((d) => !gone.has(d.teamId));
  for (const id of gone) delete db.sync.teams[id];
  db.sync.uploads = db.sync.uploads.filter((id) => !gone.has(id));
}

// Signing out or another user signing in: cloud teams leave the phone, local teams stay.
export function removeCloudData() {
  syncEpoch++;
  clearTimeout(syncTimer);
  forceFull.clear();
  removeTeamsLocally(Object.keys(db.sync.teams));
  db.sync = emptySync();
  Object.assign(syncState, { status: 'idle', error: '' });
  saveQuiet();
  hooks.onChange();
}

export function scheduleSync(ms = 3000) {
  clearTimeout(syncTimer);
  if (hooks.canSync()) syncTimer = setTimeout(hooks.request, ms);
}

// Single flight: a call while a sync runs makes it run once more afterwards.
export function runSync() {
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

async function syncOnce() {
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
    await pull(epoch, userId);
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
async function push(epoch) {
  const refused = new Set(); // teams the server refused this time
  let ok = true;
  for (const kind of RECORD_KINDS) {
    const byTeam = new Map();
    for (const r of db[kind]) {
      if (!pushable(kind, r)) continue;
      const tid = teamIdOf(kind, r);
      if (!byTeam.has(tid)) byTeam.set(tid, []);
      byTeam.get(tid).push(r);
    }
    for (const [tid, recs] of byTeam) {
      for (let i = 0; i < recs.length && !refused.has(tid); i += PUSH_BATCH) {
        const batch = recs.slice(i, i + PUSH_BATCH);
        const keys = batch.map(recordKey);
        const { error, status } = await hooks.client
          .from(kind)
          .upsert(batch.map(toRow[kind]), { onConflict: 'id' });
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

  // Deletes. Those of teams on this phone (or where this user is a coach) are never sent.
  const toSend = [];
  for (const d of db.deleted) {
    const role = roleOf(d.teamId);
    if (role === 'director' && !refused.has(d.teamId)) toSend.push(d);
    else if (role === 'coach') forceFull.add(d.teamId); // get the deleted record back
  }
  db.deleted = db.deleted.filter(
    (d) => toSend.includes(d) || (refused.has(d.teamId) && roleOf(d.teamId) === 'director'),
  );
  for (const kind of RECORD_KINDS) {
    const ds = toSend.filter((d) => d.kind === kind);
    for (let i = 0; i < ds.length; i += PUSH_BATCH) {
      const batch = ds.slice(i, i + PUSH_BATCH);
      const { error, status } = await hooks.client
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
// Otherwise this user probably isn't a director any more: drop the changes so the cloud wins,
// and download the team in full on the pull that follows (which also refreshes the role).
function pushRefused(tid) {
  if (db.sync.uploads.includes(tid)) {
    delete db.sync.teams[tid];
    db.sync.uploads = db.sync.uploads.filter((id) => id !== tid);
    syncState.error = t('syncUploadFailed');
  } else {
    for (const kind of RECORD_KINDS) for (const r of db[kind]) if (teamIdOf(kind, r) === tid) r.dirty = false;
    db.deleted = db.deleted.filter((d) => d.teamId !== tid);
    forceFull.add(tid);
  }
  saveQuiet();
  hooks.onChange();
}

// All rows of `kind` for these teams, changed after `since` (all rows when null), oldest first.
async function fetchRows(kind, teamIds, since, epoch) {
  if (!teamIds.length) return [];
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = hooks.client
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
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function pull(epoch, userId) {
  const {
    data: members,
    error,
    status,
  } = await hooks.client.from('team_members').select('team_id, role').eq('user_id', userId);
  checkEpoch(epoch);
  if (error) throw new SyncError(error, status);
  const prev = db.sync.teams;
  const teams = Object.fromEntries(members.map((m) => [m.team_id, m.role]));
  // Teams still being uploaded aren't in the cloud yet: keep them.
  for (const id of db.sync.uploads) if (prev[id] && !teams[id]) teams[id] = prev[id];
  const ids = Object.keys(teams);
  // Download in full: new teams, teams whose role changed, refused ones, and coach teams with
  // local edits (so the cloud version comes back).
  const full = new Set(
    ids.filter(
      (id) =>
        !prev[id] ||
        prev[id] !== teams[id] ||
        forceFull.has(id) ||
        (teams[id] === 'coach' &&
          RECORD_KINDS.some((kind) => db[kind].some((r) => r.dirty && teamIdOf(kind, r) === id))),
    ),
  );
  const since = db.sync.lastPulledAt
    ? new Date(Date.parse(db.sync.lastPulledAt) - PULL_OVERLAP_MS).toISOString()
    : null;
  const rows = {};
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
  db.sync.teams = teams;
  for (const id of full) forceFull.delete(id);

  let latest = db.sync.lastPulledAt;
  let rejectedRows = 0;
  for (const kind of RECORD_KINDS) {
    const index = new Map(db[kind].map((r, i) => [r.id, i]));
    const seen = new Set();
    const drop = new Set();
    for (const row of rows[kind]) {
      if (!latest || Date.parse(row.updated_at) > Date.parse(latest)) latest = row.updated_at;
      const tid = kind === 'teams' ? row.id : row.team_id;
      if (!teams[tid]) continue;
      seen.add(row.id);
      const i = index.get(row.id);
      const local = i == null ? null : db[kind][i];
      // A record moved to a team on this phone is no longer the cloud's.
      if (local && !isCloudTeam(teamIdOf(kind, local))) continue;
      if (row.deleted_at) {
        if (local) drop.add(row.id);
        // A deleted team takes its (normally already deleted) players with it.
        if (kind === 'teams') db.players = db.players.filter((p) => p.teamId !== row.id);
        continue;
      }
      if (local?.dirty && teams[teamIdOf(kind, local)] === 'director') continue; // will be uploaded
      const rec = { ...fromRow[kind](row), updatedAt: Date.parse(row.updated_at), dirty: false };
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
      if (local) db[kind][i] = rec;
      else {
        index.set(rec.id, db[kind].length);
        db[kind].push(rec);
      }
      changed = true;
    }
    // Teams downloaded in full: what the cloud doesn't have isn't theirs (except changes a
    // director hasn't uploaded yet).
    for (const r of db[kind]) {
      const tid = teamIdOf(kind, r);
      if (full.has(tid) && !seen.has(r.id) && !(r.dirty && teams[tid] === 'director')) drop.add(r.id);
    }
    if (drop.size) {
      db[kind] = db[kind].filter((r) => !drop.has(r.id));
      changed = true;
    }
  }
  db.sync.lastPulledAt = latest;
  saveQuiet();
  if (changed) hooks.onChange();
  if (rejectedRows) hooks.onRejected(rejectedRows);
}
