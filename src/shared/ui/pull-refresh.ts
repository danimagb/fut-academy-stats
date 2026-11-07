// Pull to refresh: pulling down from the top of the page shows a round indicator; pulled far
// enough and let go, it spins while `refresh` runs. Browsers have their own gesture, but an app
// opened from the home screen doesn't, so app/ installs this one only there.

const START_PX = 8; // ignore tiny moves (taps, horizontal swipes)
const TRIGGER_PX = 70; // how far to pull (finger distance) to refresh
const MAX_PX = 110;

const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg>';

export function installPullToRefresh(o: {
  /** Whether the gesture may start now (not while dragging, in a sheet, …). */
  enabled: () => boolean;
  refresh: () => Promise<unknown>;
  label: () => string;
}): void {
  const el = document.createElement('div');
  el.className = 'ptr';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="ptr-icon">${ARROW}</span>`;
  el.hidden = true;
  document.body.append(el);
  const icon = el.firstElementChild as HTMLElement;

  let startY: number | null = null;
  let startX = 0;
  let pull = 0;
  let busy = false;

  const show = (px: number): void => {
    el.hidden = px <= 0;
    const ready = px >= TRIGGER_PX;
    el.classList.toggle('ready', ready);
    el.style.transform = `translateY(${Math.min(px, MAX_PX) * 0.6}px)`;
    icon.style.transform = `rotate(${Math.min(px, TRIGGER_PX) * 4}deg)`; // turns until it's ready
  };
  const reset = (): void => {
    startY = null;
    pull = 0;
    el.classList.remove('ready', 'spin');
    el.removeAttribute('aria-label');
    el.hidden = true;
    el.style.transform = '';
    icon.style.transform = '';
  };

  document.addEventListener(
    'touchstart',
    (e) => {
      if (busy || e.touches.length !== 1 || window.scrollY > 0 || !o.enabled()) return;
      const touch = e.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      startX = touch.clientX;
      pull = 0;
    },
    { passive: true },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      const touch = e.touches[0];
      if (startY == null || !touch) return;
      const dy = touch.clientY - startY;
      // Scrolled away, pushing up, or a sideways swipe: not a pull.
      if (window.scrollY > 0 || dy < 0 || (pull === 0 && Math.abs(touch.clientX - startX) > Math.abs(dy))) {
        reset();
        return;
      }
      pull = dy < START_PX ? 0 : dy - START_PX;
      show(pull);
    },
    { passive: true },
  );
  const end = (): void => {
    if (startY == null) return;
    const go = pull >= TRIGGER_PX;
    startY = null;
    if (!go) return reset();
    busy = true;
    el.classList.add('spin');
    el.setAttribute('aria-label', o.label());
    el.style.transform = `translateY(${TRIGGER_PX * 0.6}px)`;
    icon.style.transform = '';
    void o
      .refresh()
      .catch(() => {})
      .finally(() => {
        busy = false;
        reset();
      });
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', reset, { passive: true });
}
