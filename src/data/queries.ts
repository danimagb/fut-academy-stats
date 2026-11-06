// Reading the store: lookups the screens share.
import { deriveState, type GameState } from '@/domain/game-state';
import type { Game, Player, Team } from '@/domain/types';
import { route } from '@/shared/lib/route';
import { db } from './store';

export const getGame = (id: string | undefined): Game | undefined => db.games.find((g) => g.id === id);
export const getTeam = (id: string | null | undefined): Team | undefined =>
  db.teams.find((tm) => tm.id === id);
export const teamPlayers = (teamId: string | undefined): Player[] =>
  db.players.filter((p) => p.teamId === teamId);

/** A game's state now (see domain/game-state.ts). */
export const derive = (g: Game): GameState => deriveState(g, Date.now());

/** The game shown on the game or report screen, if any. */
export function currentGame(): Game | null | undefined {
  const { view, id } = route();
  return view === 'game' || view === 'report' ? getGame(id) : null;
}
