// Who may change what (the database refuses the rest anyway). Teams on this phone: everything.
// Cloud teams: team coaches read only; team managers change players and games but not the
// team itself or its staff; club managers (of the team's club) everything.
import type { Game, Team } from '@/domain/types';
import { db, isCloudTeam } from './store';
import { roleCanWrite, roleOf } from './sync';
import { deviceId } from './device';
import { cloud } from './session';

export const readOnlyTeam = (teamId: string | null | undefined): boolean => roleOf(teamId) === 'team_coach';
/** May rename or delete the team and choose its staff. */
export const canManageTeam = (teamId: string | null | undefined): boolean =>
  !!teamId && (!isCloudTeam(teamId) || roleOf(teamId) === 'club_manager');
/**
 * A cloud team's live game is logged by one phone, its owner (set at kick-off): on any other
 * phone it is read-only until it finishes, or until someone takes it over (see takeOver).
 */
export const loggedElsewhere = (g: Game | null | undefined): boolean =>
  !!g?.owner &&
  (g.status === 'live' || g.status === 'break') &&
  isCloudTeam(g.teamId) &&
  g.owner.deviceId !== deviceId();
export const readOnlyGame = (g: Game | null | undefined): boolean =>
  !!g && (readOnlyTeam(g.teamId) || loggedElsewhere(g));
/** May take over a game logged on another phone: who may write the team's games. */
export const canTakeOver = (g: Game | null | undefined): boolean =>
  !!g && loggedElsewhere(g) && roleCanWrite(roleOf(g.teamId), 'games');

/** This phone becomes the game's owner: at kick-off (`from` unset), or taking over from another phone. */
export function claimGame(g: Game, takeOver = false): void {
  const userId = cloud.session?.user?.id;
  if (!userId || !isCloudTeam(g.teamId)) return;
  const prev = g.owner;
  g.owner = {
    userId,
    email: cloud.session?.user?.email ?? '',
    deviceId: deviceId(),
    at: Date.now(),
    ...(takeOver && prev ? { from: prev.deviceId } : {}),
  };
}
/** Teams this user may create games in / move games to. */
export const writableTeams = (): Team[] => db.teams.filter((tm) => !readOnlyTeam(tm.id));
