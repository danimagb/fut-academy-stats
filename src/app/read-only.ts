// Which actions and forms are allowed on a read-only (coach) screen.
import { draft } from '@/pages/game-edit/game-edit';
import { readOnlyGame, readOnlyTeam } from '@/data/access';
import { getGame } from '@/data/queries';
import { route } from '@/shared/lib/route';

// ---------- Team access: read-only coach view ----------
// In a cloud team where this user's role is 'coach' everything is read-only: the views hide the
// edit controls, and the click / submit / input handlers and dragging refuse anything that would
// change data (the database refuses those writes anyway). Teams on this phone are never
// read-only.

// Is the screen being shown (and its sheets) about a read-only team or game?
export function viewReadOnly(): boolean {
  const { view, id } = route();
  if (view === 'team') return readOnlyTeam(id);
  if (view === 'game' || view === 'report' || view === 'edit') return readOnlyGame(getGame(id));
  if (view === 'new') return !!draft && readOnlyTeam(draft.teamId);
  return false;
}

// Actions allowed on a read-only screen. Everything else is refused there: delete-team,
// edit-player, delete-player, upload-team, remove-coach, sel, set-gk, set-home, save-game,
// kickoff, resume, end-period, next-period, do-sub, goal, yellow, red, make-gk, formation,
// set-formation, opp-goal, fix-open, fix-end, fix-started, fix-apply, edit-goal, set-scorer,
// delete-goal, undo-toast, undo, edit-info, delete-game (and any action added later, until it is
// listed here). The admin-* actions are only on the Admin page, which is never read-only.
export const READ_ONLY_OK: ReadonlySet<string> = new Set([
  'close-sheet',
  'menu-toggle',
  'games-team',
  'soon', // navigation
  'theme',
  'lang',
  'backup', // settings
  'signin-back',
  'signin-resend',
  'sign-out',
  'sync-now',
  'privacy', // account and sync
  'auth-mode',
  'change-password',
  'cancel-password',
  'profile-section',
  'pdf',
  'player-pdf', // share the report / a player's stats sheet
  'stats-team',
  'stats-season', // stats page filters
  'player', // opens a read-only info sheet for coaches (see actions.player)
  'team-section',
  'people-reload',
  'leave-team', // team screen sections (anyone may leave a team)
  'new-team', // creates a team of their own
]);
// Forms allowed on a read-only screen (others: add-player, edit-player, add-player-draft, game-info).
export const READ_ONLY_FORMS: ReadonlySet<string> = new Set([
  'signin-email',
  'signin-code',
  'signin-password',
  'set-password',
  'upload-teams',
]);
