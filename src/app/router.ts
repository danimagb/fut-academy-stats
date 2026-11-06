// Hash routing: "#/view/id". Screens register themselves with `setViews`; `render()` draws the
// screen for the current hash. The app runs extra work around each render with `onRender`
// (closing the sheet before, the tab bar and wake lock after).

import { route, type Route } from '@/shared/lib/route';

export { route, type Route };
type View = (id: string | undefined) => void;

const views: Record<string, View> = {};
let fallback: View = () => {};
let before: () => void = () => {};
let after: (route: Route) => void = () => {};
/** A screen shown instead of every other one while it returns a view (e.g. signing in). */
let gate: () => View | null = () => null;

/** Sets the gate: when it returns a view, that view is drawn whatever the hash says. */
export function setGate(fn: () => View | null): void {
  gate = fn;
}

/** Whether the gate is showing now (the app hides the tab bar then). */
export const gated = (): boolean => !!gate();

/** Adds screens by view name (a name added twice is an error). */
export function addViews(next: Record<string, View>): void {
  for (const [name, view] of Object.entries(next)) {
    if (views[name]) throw new Error(`View "${name}" is registered twice`);
    views[name] = view;
  }
}

/** The screen shown for an unknown view. */
export function setFallbackView(view: View): void {
  fallback = view;
}

export function onRender(hooks: { before?: () => void; after?: (route: Route) => void }): void {
  if (hooks.before) before = hooks.before;
  if (hooks.after) after = hooks.after;
}

/** Draws the screen for the current hash. */
export function render(): void {
  before();
  const r = route();
  (gate() ?? views[r.view] ?? fallback)(r.id);
  after(r);
}
