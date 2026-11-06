// Drag a player onto another to substitute (or to swap positions).
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

/** A player chip: a button on the pitch or the bench (data-id, and data-slot on the pitch). */
type Chip = HTMLElement & { disabled?: boolean };

type DragState = {
  timer: ReturnType<typeof setTimeout> | undefined;
  /** The hold time passed: the chip is being dragged. */
  active: boolean;
  moved: boolean;
  from: Chip | null;
  x0: number;
  y0: number;
  /** Where the chip was grabbed, from its top left corner. */
  dx: number;
  dy: number;
  ghost: HTMLElement | null;
  target: Chip | null;
  /** Swallow the click that ends a drag. */
  suppressClick: boolean;
};

export const drag: DragState = {
  timer: undefined,
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

export function chipAt(x: number, y: number): Chip | null {
  const el = document.elementFromPoint(x, y)?.closest<Chip>('.chip');
  return el && !el.disabled ? el : null;
}

// 'sub' (bench <-> pitch), 'move' (pitch -> pitch spot) or null.
export function dropKind(from: Element, to: Element): 'sub' | 'move' | null {
  const spot = (el: Element): boolean => el.classList.contains('tok') || el.classList.contains('slot-empty');
  if (spot(from) && spot(to)) {
    if (to.classList.contains('slot-empty') && from.classList.contains('gk')) return null;
    return 'move';
  }
  if (to.classList.contains('slot-empty')) return null;
  return from.classList.contains('on') !== to.classList.contains('on') ? 'sub' : null;
}

export function dragStart(chip: Chip, x: number, y: number): void {
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
    const ghost = chip.cloneNode(true) as HTMLElement;
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

export function dragMove(x: number, y: number, e: Event): void {
  if (!drag.from) return;
  if (!drag.active) {
    if (Math.hypot(x - drag.x0, y - drag.y0) > 10) dragCancel();
    return;
  }
  e.preventDefault();
  drag.moved = true;
  if (drag.ghost) {
    drag.ghost.style.left = `${x - drag.dx}px`;
    drag.ghost.style.top = `${y - drag.dy}px`;
  }
  const t = chipAt(x, y);
  const valid = t && t !== drag.from && dropKind(drag.from, t);
  drag.target?.classList.remove('drop');
  drag.target = valid ? t : null;
  drag.target?.classList.add('drop');
}

export function dragEnd(): void {
  const { active, moved, from, target } = drag;
  if (!from) return;
  dragCancel();
  if (!active) return;
  drag.suppressClick = true;
  setTimeout(() => (drag.suppressClick = false), 400);
  const g = currentGame();
  const fromId = from.dataset.id ?? '';
  if (!g) return;
  if (target && dropKind(from, target) === 'move') {
    movePlayer(g, fromId, Number(target.dataset.slot));
  } else if (target) {
    const targetId = target.dataset.id ?? '';
    const fromOn = from.classList.contains('on');
    const [out, inn] = fromOn ? [fromId, targetId] : [targetId, fromId];
    doSub(g, out, inn);
  } else if (!moved) {
    openPlayerSheet(g, fromId);
  }
}

export function dragCancel(): void {
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.from?.classList.remove('dragging');
  drag.target?.classList.remove('drop');
  document.body.classList.remove('is-dragging', 'from-on', 'from-bench');
  Object.assign(drag, { timer: undefined, active: false, from: null, ghost: null, target: null });
}

/** Listens for touch and mouse drags on player chips (once, at startup). */
/** The chip under an event's target, if any. */
const chipOf = (e: Event): Chip | null => (e.target as Element | null)?.closest?.<Chip>('.chip') ?? null;

export function installDrag(): void {
  document.addEventListener(
    'touchstart',
    (e) => {
      const chip = chipOf(e);
      const touch = e.touches[0];
      if (chip && touch && e.touches.length === 1) dragStart(chip, touch.clientX, touch.clientY);
    },
    { passive: true },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      const touch = e.touches[0];
      if (touch) dragMove(touch.clientX, touch.clientY, e);
    },
    { passive: false },
  );
  document.addEventListener('touchend', dragEnd);
  document.addEventListener('touchcancel', dragCancel);

  // Mouse version, handy when testing on a computer.
  document.addEventListener('mousedown', (e) => {
    const chip = chipOf(e);
    if (chip && e.button === 0) dragStart(chip, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY, e));
  document.addEventListener('mouseup', dragEnd);

  document.addEventListener('contextmenu', (e) => {
    if (chipOf(e)) e.preventDefault();
  });
}
