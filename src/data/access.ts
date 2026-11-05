// Who may change what. In a cloud team where this user's role is 'coach' everything is
// read-only (the database refuses those writes anyway); teams on this phone are never read-only.
import type { Game, Team } from '@/domain/types';
import { db } from './store';
import { roleOf } from './sync';

export const readOnlyTeam = (teamId: string | null | undefined): boolean => roleOf(teamId) === 'coach';
export const readOnlyGame = (g: Game | null | undefined): boolean => !!g && readOnlyTeam(g.teamId);
/** Teams this user may create games in / move games to. */
export const writableTeams = (): Team[] => db.teams.filter((tm) => !readOnlyTeam(tm.id));
