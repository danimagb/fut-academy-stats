// Changes to teams, players and games (not running a game) go to the cloud straight away: the
// change is made, saved and uploaded at once, and kept only if the cloud took it. Otherwise
// (no signal, the server refused it, it couldn't be sent) everything is put back as it was, so
// nothing waits on the phone. Running a live game stays local-first (save() + sync later).
import { RECORD_KINDS, db, recordKey, saveQuiet, teamIdOf } from './store';
import type { RecordKind, Tombstone } from '@/domain/types';
import { save } from './save';
import { offlineNow } from './online';
import { refusedTeams, runSync, syncState } from './sync';

export type CloudResult = 'ok' | 'offline' | 'refused' | 'failed';

type Key = string;
const keyOf = (kind: RecordKind, id: string): Key => `${kind}:${id}`;
const dirtyKeys = (): Set<Key> => {
  const out = new Set<Key>();
  for (const kind of RECORD_KINDS)
    for (const r of db[kind] as { id: string; dirty?: boolean }[]) if (r.dirty) out.add(keyOf(kind, r.id));
  return out;
};

/**
 * Makes a change (`apply` edits `db`), uploads it now and waits. 'ok': the cloud has it. Any
 * other result: `db` is as it was before, and the result says why.
 */
export async function cloudChange(apply: () => void): Promise<CloudResult> {
  if (offlineNow()) return 'offline';
  const before = structuredClone({
    teams: db.teams,
    players: db.players,
    games: db.games,
    deleted: db.deleted,
    sync: db.sync,
  });
  const wasDirty = dirtyKeys();
  const oldRecords = new Map<Key, string>();
  for (const kind of RECORD_KINDS)
    for (const r of db[kind] as { id: string }[]) oldRecords.set(keyOf(kind, r.id), recordKey(r));
  const oldTombs = new Set<Tombstone>(db.deleted);

  apply();
  save();

  // What this change made dirty (new or edited records) and the deletes it left.
  const changed: { kind: RecordKind; id: string; teamId: string }[] = [];
  for (const kind of RECORD_KINDS)
    for (const r of db[kind] as { id: string; dirty?: boolean }[]) {
      const k = keyOf(kind, r.id);
      if (r.dirty && (!wasDirty.has(k) || oldRecords.get(k) !== recordKey(r)))
        changed.push({ kind, id: r.id, teamId: teamIdOf(kind, r) });
    }
  const deletes = db.deleted.filter((d) => !oldTombs.has(d));

  await runSync();

  const stillDirty = changed.some(({ kind, id }) =>
    (db[kind] as { id: string; dirty?: boolean }[]).some((r) => r.id === id && r.dirty),
  );
  const stillDeleting = deletes.some((d) => db.deleted.includes(d));
  const refused =
    changed.some((c) => refusedTeams.has(c.teamId)) ||
    deletes.some((d) => !!d.teamId && refusedTeams.has(d.teamId));
  if (syncState.status === 'ok' && !stillDirty && !stillDeleting && !refused) return 'ok';

  // Not in the cloud: put everything back as it was (without counting it as a change).
  Object.assign(db, before);
  saveQuiet();
  if (refused) return 'refused';
  return syncState.status === 'offline' ? 'offline' : 'failed';
}
