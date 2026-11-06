export type Route = { view: string; id: string | undefined };

/** The current screen and id, from the hash ("#/game/abc" → { view: 'game', id: 'abc' }). */
export function route(): Route {
  const [, view = 'games', id] = location.hash.split('/');
  return { view, id };
}

/**
 * Runs `fn` whenever the route changes (leaving a screen), before the next screen is drawn:
 * modules call this when they load, so their listener comes before the app's render. For state
 * that should only last while a screen is open (e.g. which sections are expanded).
 */
export function onLeave(fn: () => void): void {
  window.addEventListener('hashchange', fn);
}
