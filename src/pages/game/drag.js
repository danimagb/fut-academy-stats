// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// Drag a player onto another to substitute (or to swap positions). Moved from app/legacy.js.
import { currentGame } from '@/data/queries';
import { openPlayerSheet } from './game';
import { doSub, movePlayer } from '@/features/live-game/live-game';
import { readOnlyGame } from '@/data/access';
import { canRecord } from '@/domain/game-state';
import { route } from '@/shared/lib/route';
import { buzz } from '@/shared/lib/device';

// ---------- Drag a player onto another to substitute ----------
// Hold a player briefly, then drag onto a player in the other group (bench <-> pitch) to sub,
// or onto another pitch player / empty spot to swap positions.
// A quick swipe still scrolls the page; a plain tap still opens the player sheet.

export const drag = {
  timer: null,
  active: false,
  moved: false,
  from: null,
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
  ghost: null,
  target: null,
  suppressClick: false,
};

export function chipAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.chip');
  return el && !el.disabled ? el : null;
}

// 'sub' (bench <-> pitch), 'move' (pitch -> pitch spot) or null.
export function dropKind(from, to) {
  const spot = (el) => el.classList.contains('tok') || el.classList.contains('slot-empty');
  if (spot(from) && spot(to)) {
    if (to.classList.contains('slot-empty') && from.classList.contains('gk')) return null;
    return 'move';
  }
  if (to.classList.contains('slot-empty')) return null;
  return from.classList.contains('on') !== to.classList.contains('on') ? 'sub' : null;
}

export function dragStart(chip, x, y) {
  if (chip.disabled || !chip.dataset.id || route().view !== 'game') return;
  const g = currentGame();
  if (!g || readOnlyGame(g) || !canRecord(g)) return;
  Object.assign(drag, { from: chip, x0: x, y0: y, moved: false, target: null });
  drag.timer = setTimeout(() => {
    drag.active = true;
    buzz();
    // Keep the point where the player was grabbed under the finger (a pitch token's circle is
    // at its top, so centring the token on the finger would make the circle jump up).
    const r = chip.getBoundingClientRect();
    drag.dx = x - r.left;
    drag.dy = y - r.top;
    const ghost = chip.cloneNode(true);
    ghost.className += ' ghost';
    Object.assign(ghost.style, {
      width: `${chip.offsetWidth}px`,
      left: `${r.left}px`,
      top: `${r.top}px`,
      transformOrigin: `${drag.dx}px ${drag.dy}px`,
    });
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    chip.classList.add('dragging');
    document.body.classList.add('is-dragging', chip.classList.contains('on') ? 'from-on' : 'from-bench');
  }, 220);
}

export function dragMove(x, y, e) {
  if (!drag.from) return;
  if (!drag.active) {
    if (Math.hypot(x - drag.x0, y - drag.y0) > 10) dragCancel();
    return;
  }
  e.preventDefault();
  drag.moved = true;
  drag.ghost.style.left = `${x - drag.dx}px`;
  drag.ghost.style.top = `${y - drag.dy}px`;
  const t = chipAt(x, y);
  const valid = t && t !== drag.from && dropKind(drag.from, t);
  drag.target?.classList.remove('drop');
  drag.target = valid ? t : null;
  drag.target?.classList.add('drop');
}

export function dragEnd() {
  if (!drag.from) return;
  const { active, moved, from, target } = drag;
  dragCancel();
  if (!active) return;
  drag.suppressClick = true;
  setTimeout(() => (drag.suppressClick = false), 400);
  const g = currentGame();
  if (target && dropKind(from, target) === 'move') {
    movePlayer(g, from.dataset.id, Number(target.dataset.slot));
  } else if (target) {
    const fromOn = from.classList.contains('on');
    const [out, inn] = fromOn ? [from.dataset.id, target.dataset.id] : [target.dataset.id, from.dataset.id];
    doSub(g, out, inn);
  } else if (!moved) {
    openPlayerSheet(g, from.dataset.id);
  }
}

export function dragCancel() {
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.from?.classList.remove('dragging');
  drag.target?.classList.remove('drop');
  document.body.classList.remove('is-dragging', 'from-on', 'from-bench');
  Object.assign(drag, { timer: null, active: false, from: null, ghost: null, target: null });
}

/** Listens for touch and mouse drags on player chips (once, at startup). */
export function installDrag() {
  document.addEventListener(
    'touchstart',
    (e) => {
      const chip = e.target.closest('.chip');
      if (chip && e.touches.length === 1) dragStart(chip, e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );
  document.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX, e.touches[0].clientY, e), {
    passive: false,
  });
  document.addEventListener('touchend', dragEnd);
  document.addEventListener('touchcancel', dragCancel);

  // Mouse version, handy when testing on a computer.
  document.addEventListener('mousedown', (e) => {
    const chip = e.target.closest('.chip');
    if (chip && e.button === 0) dragStart(chip, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY, e));
  document.addEventListener('mouseup', dragEnd);

  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.chip')) e.preventDefault();
  });
}
