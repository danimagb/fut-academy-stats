/** The first element matching `sel`, or null. */
export const $ = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);

/** Every element matching `sel`, as an array. */
export const $$ = (sel: string): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(sel)];
