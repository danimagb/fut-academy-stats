// A new team goes straight into a club this user manages: it becomes a cloud team of the club
// (its name is the club's), this user manages it as club manager, and it's uploaded right away.
import { getTeam } from '@/data/queries';
import { cloud, syncNow } from '@/data/session';
import { managedClubs } from '@/data/auth';
import { syncState } from '@/data/sync';
import { RECORD_KINDS, db, isCloudTeam, saveQuiet, syncGameTeams, teamIdOf } from '@/data/store';
import { rerender } from '@/shared/lib/rerender';

/** The club a new team goes into: the given one if this user manages it, else the first. */
export function uploadClub(clubId?: string): { id: string; name: string } | undefined {
  const clubs = managedClubs(cloud.account);
  return clubs.find((c) => c.id === clubId) ?? clubs[0];
}

/** Makes these just-created teams cloud teams of the club, and uploads them. */
export function uploadTeams(ids: readonly string[], clubId?: string): void {
  const club = uploadClub(clubId);
  if (!club) return;
  syncState.error = ''; // a previous upload's error (it stays until the next upload)
  for (const id of ids) {
    const tm = getTeam(id);
    if (!tm || isCloudTeam(id)) continue;
    Object.assign(tm, { clubId: club.id, club: club.name });
    syncGameTeams(db, id);
    db.sync.teams[id] = 'club_manager';
    if (!db.sync.uploads.includes(id)) db.sync.uploads.push(id);
    for (const kind of RECORD_KINDS)
      for (const r of db[kind] as { id: string; teamId?: string; dirty?: boolean }[])
        if (teamIdOf(kind, r) === id) r.dirty = true;
  }
  saveQuiet();
  rerender();
  void syncNow();
}
