export type Route = { view: string; id: string | undefined };

/** The current screen and id, from the hash ("#/game/abc" → { view: 'game', id: 'abc' }). */
export function route(): Route {
  const [, view = 'games', id] = location.hash.split('/');
  return { view, id };
}
