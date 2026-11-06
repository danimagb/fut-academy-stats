// What needs the internet in a cloud team. Running a game works offline (kick-off, subs, goals,
// cards, the clock, fixing times, full time) and syncs when the signal is back; changing the
// team itself (players, the team's name, new or deleted teams) and creating, editing or deleting
// games need the internet, so those changes reach the cloud straight away and never wait on a
// phone. Teams that are only on this phone (no account) work offline for everything.
import { draft } from '@/pages/game-edit/game-edit';
import { canUpload } from '@/data/session';
import { getGame } from '@/data/queries';
import { writableTeams } from '@/data/access';
import { isCloudTeam } from '@/data/store';
import { route } from '@/shared/lib/route';
import { t } from '@/shared/i18n/i18n';
import { toast } from '@/shared/ui/toast';

import { offlineNow } from '@/data/online';
export { teamEditableNow } from '@/data/online';

/** Actions that change a team, its players or a game's details (not running the game). */
export const ONLINE_ACTIONS: ReadonlySet<string> = new Set([
  'new-game',
  'new-team',
  'delete-team',
  'add-player',
  'edit-player',
  'delete-player',
  'upload-team',
  'save-game',
  'edit-info',
  'delete-game',
  'take-over', // offline, two phones would log the same game
]);
/** Forms that do the same. */
export const ONLINE_FORMS: ReadonlySet<string> = new Set([
  'add-player',
  'add-player-draft',
  'edit-player',
  'game-info',
]);

/** The team the current screen changes (null: none, or not known). */
function screenTeam(): string | null {
  const { view, id } = route();
  if (view === 'team') return id ?? null;
  if (view === 'new' || view === 'edit') return draft?.teamId ?? null;
  if (view === 'game' || view === 'report') return getGame(id)?.teamId ?? null;
  return null;
}

/** Whether this action / form is about a cloud team (or would create one) while offline. */
export function needsInternet(name: string): boolean {
  if (!offlineNow()) return false;
  if (name === 'new-team') return canUpload(); // a club manager's new team is a cloud team
  // New game: refused when every team a game could be created in is a cloud team (a team on
  // this phone still works offline).
  if (name === 'new-game') {
    const teams = writableTeams();
    return teams.length > 0 && teams.every((tm) => isCloudTeam(tm.id));
  }
  const tid = screenTeam();
  return !!tid && isCloudTeam(tid);
}

export const refuseOffline = (): void => toast(t('needsInternet'));
