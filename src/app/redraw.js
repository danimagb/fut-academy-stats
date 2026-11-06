// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
import { drag } from '@/pages/game/drag';
import { $ } from '@/shared/lib/dom';
import { render } from '@/app/router';

// Re-render after a sync changed the data, but not while the user is in the middle of
// something (typing, a sheet or dialog open, a ⋯ menu, dragging a player): then later.
export let renderPending = false;
export function canRenderNow() {
  const a = document.activeElement;
  return (
    $('#sheet').hidden &&
    !document.querySelector('.dialog') &&
    !document.querySelector('.menu-list:not([hidden])') &&
    !(a && a.matches('input, textarea, select')) &&
    !drag.active &&
    !drag.timer
  );
}
export function renderSoon() {
  if (canRenderNow()) render();
  else renderPending = true;
}

/** Called at the start of every render: nothing is waiting any more. */
export function markRendered() {
  renderPending = false;
}
