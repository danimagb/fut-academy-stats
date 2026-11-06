// Is there a connection now? (For what needs the internet: see app/online-only.ts.)
import { isCloudTeam } from './store';
import { syncState } from './sync';

/** No connection now (the phone says so, or the last sync couldn't reach the server). */
export const offlineNow = (): boolean => !navigator.onLine || syncState.status === 'offline';

/** A cloud team's own details (name, players) can only be changed online. */
export const teamEditableNow = (teamId: string): boolean => !(offlineNow() && isCloudTeam(teamId));
