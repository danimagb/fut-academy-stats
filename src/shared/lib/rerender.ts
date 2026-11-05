// Lets any layer ask for the screen to be drawn again without importing the router (which lives
// in app/, above everything else). app/ connects these at startup with setRerender().

const noop = (): void => {};
const fns = { now: noop, soon: noop, tabbar: noop };

export function setRerender(next: Partial<typeof fns>): void {
  Object.assign(fns, next);
}

/** Draw the current screen again now. */
export const rerender = (): void => fns.now();
/** Draw it again when the user isn't in the middle of something (typing, a sheet, a drag). */
export const rerenderSoon = (): void => fns.soon();
/** Only the tab bar (e.g. the Admin tab follows the account). */
export const rerenderTabbar = (): void => fns.tabbar();
