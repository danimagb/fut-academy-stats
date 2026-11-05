// Hash routing: "#/view/id". Screens register themselves with `setViews`; `render()` draws the
// screen for the current hash. The app runs extra work around each render with `onRender`
// (closing the sheet before, the tab bar and wake lock after).

export type Route = { view: string; id: string | undefined };
type View = (id: string | undefined) => void;

let views: Record<string, View> = {};
let fallback: View = () => {};
let before: () => void = () => {};
let after: (route: Route) => void = () => {};

/** The current screen and id, from the hash ("#/game/abc" → { view: 'game', id: 'abc' }). */
export function route(): Route {
  const [, view = 'games', id] = location.hash.split('/');
  return { view, id };
}

/** The screens by view name, and the one shown for an unknown view. */
export function setViews(next: Record<string, View>, fallbackView: View): void {
  views = next;
  fallback = fallbackView;
}

export function onRender(hooks: { before?: () => void; after?: (route: Route) => void }): void {
  if (hooks.before) before = hooks.before;
  if (hooks.after) after = hooks.after;
}

/** Draws the screen for the current hash. */
export function render(): void {
  before();
  const r = route();
  (views[r.view] ?? fallback)(r.id);
  after(r);
}
