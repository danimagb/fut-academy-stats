// Who may change what (the database refuses the rest anyway). Teams on this phone: everything.
// Cloud teams: team coaches read only; team managers change players and games but not the
// team itself or its staff; club managers (of the team's club) everything.
import type { Game, Team } from '@/domain/types';
import { db, isCloudTeam } from './store';
import { roleOf } from './sync';

export const readOnlyTeam = (teamId: string | null | undefined): boolean => roleOf(teamId) === 'team_coach';
/** May rename or delete the team and choose its staff. */
export const canManageTeam = (teamId: string | null | undefined): boolean =>
  !!teamId && (!isCloudTeam(teamId) || roleOf(teamId) === 'club_manager');
export const readOnlyGame = (g: Game | null | undefined): boolean => !!g && readOnlyTeam(g.teamId);
/** Teams this user may create games in / move games to. */
export const writableTeams = (): Team[] => db.teams.filter((tm) => !readOnlyTeam(tm.id));
