import { $ } from '@/shared/lib/dom';
import { esc } from '@/shared/lib/html';

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * A short message at the bottom of the screen. `msg` is plain text; pass `{ html }` for
 * already-escaped markup. Optional button HTML (e.g. Undo) is shown next to it, and keeps the
 * message up longer.
 */
export function toast(msg: string | { html: string }, button = ''): void {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = `<span>${typeof msg === 'string' ? esc(msg) : msg.html}</span>${button}`;
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => (el.hidden = true), button ? 6000 : 2200);
}
