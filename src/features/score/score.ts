import type { GameState } from '@/domain/game-state';
import type { Game } from '@/domain/types';

/**
 * The score in the same order as the match title (home side first). With `colour`, our goals
 * are wrapped in .us and theirs in .them (no colour on a draw).
 */
export function scoreHtml(
  g: Pick<Game, 'home'>,
  d: Pick<GameState, 'us' | 'them'>,
  sep = '–',
  colour = false,
): string {
  const goals = (who: 'us' | 'them') => {
    const n = who === 'us' ? d.us : d.them;
    return colour && d.us !== d.them ? `<span class="${who}">${n}</span>` : `${n}`;
  };
  return g.home === false ? `${goals('them')}${sep}${goals('us')}` : `${goals('us')}${sep}${goals('them')}`;
}
