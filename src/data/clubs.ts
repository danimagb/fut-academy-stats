// Clubs as the phone knows them (db.sync.clubs, from the last sync) and how teams are grouped
// and named with them.
import type { SyncClub, Team } from '@/domain/types';
import { teamFull, teamLabel } from '@/domain/titles';
import { db } from './store';

/** The club of a cloud team, if the phone knows it. */
export const clubOfTeam = (tm: Pick<Team, 'clubId'>): SyncClub | null =>
  (tm.clubId && db.sync.clubs[tm.clubId]) || null;

/** "PFC - Sub-7B" when the club has a short name, else the usual "Club - Age group". */
export const teamShortLabel = (tm: Pick<Team, 'club' | 'name' | 'clubId'>): string => {
  const short = clubOfTeam(tm)?.shortName;
  return short ? teamFull(short, tm.name) : teamLabel(tm);
};

export type TeamGroup = { clubId: string | null; name: string; shortName: string; teams: Team[] };

/** The teams for the teams list, by club (clubs in name order), each group's teams in name order. */
export function teamGroups(): TeamGroup[] {
  const byClub = new Map<string, TeamGroup>();
  for (const tm of db.teams) {
    const id = tm.clubId ?? '';
    const club = db.sync.clubs[id];
    const group = byClub.get(id) ?? {
      clubId: id || null,
      name: club?.name ?? tm.club,
      shortName: club?.shortName ?? '',
      teams: [],
    };
    group.teams.push(tm);
    byClub.set(id, group);
  }
  const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);
  const groups = [...byClub.values()].sort(byName);
  for (const g of groups) g.teams.sort(byName);
  return groups;
}
