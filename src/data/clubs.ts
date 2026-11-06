// Clubs as the phone knows them (db.sync.clubs, from the last sync) and how teams are grouped
// and named with them.
import type { SyncClub, Team } from '@/domain/types';
import { teamFull, teamLabel } from '@/domain/titles';
import { db, isCloudTeam } from './store';

/** The club of a cloud team, if the phone knows it. */
export const clubOfTeam = (tm: Pick<Team, 'clubId'>): SyncClub | null =>
  (tm.clubId && db.sync.clubs[tm.clubId]) || null;

/** "PFC - Sub-7B" when the club has a short name, else the usual "Club - Age group". */
export const teamShortLabel = (tm: Pick<Team, 'club' | 'name' | 'clubId'>): string => {
  const short = clubOfTeam(tm)?.shortName;
  return short ? teamFull(short, tm.name) : teamLabel(tm);
};

export type TeamGroup = { clubId: string | null; name: string; shortName: string; teams: Team[] };

/**
 * The teams on this phone for the teams list: cloud teams by club (clubs in name order), then
 * the teams that are only on this phone (clubId null). Each group's teams in name order.
 */
export function teamGroups(): TeamGroup[] {
  const byClub = new Map<string, TeamGroup>();
  const local: Team[] = [];
  for (const tm of db.teams) {
    if (!isCloudTeam(tm.id) || !tm.clubId) {
      local.push(tm);
      continue;
    }
    const club = db.sync.clubs[tm.clubId];
    const group = byClub.get(tm.clubId) ?? {
      clubId: tm.clubId,
      name: club?.name ?? tm.club,
      shortName: club?.shortName ?? '',
      teams: [],
    };
    group.teams.push(tm);
    byClub.set(tm.clubId, group);
  }
  const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);
  const groups = [...byClub.values()].sort(byName);
  for (const g of groups) g.teams.sort(byName);
  if (local.length) groups.push({ clubId: null, name: '', shortName: '', teams: local });
  return groups;
}
