// Showing a wide page (the report's PDF preview) on a phone: scaled down to fit as a thumbnail,
// and full screen on top of everything to read it, with pinch and double-tap zoom.
import { t } from '@/shared/i18n/i18n';

/**
 * Scales `content` (laid out at its natural width) down to the width of `box`, and gives `box`
 * the scaled height. Again whenever the box changes size (rotating the phone).
 */
export function fitWidth(box: HTMLElement, content: HTMLElement): void {
  const fit = (): void => {
    const s = Math.min(1, box.clientWidth / content.offsetWidth);
    content.style.transform = `scale(${s})`;
    box.style.height = `${Math.ceil(content.offsetHeight * s)}px`;
  };
  fit();
  new ResizeObserver(fit).observe(box);
}

const MAX = 2.5;

/**
 * Shows `html` full screen over the app: first the whole of it (fitted to the screen's width),
 * then pinch with two fingers or double-tap to zoom, drag to move. ✕, Escape or the back
 * gesture (a route change) close it.
 */
export function openZoom(html: string, label: string): void {
  const el = document.createElement('div');
  el.className = 'zoom';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', label);
  el.innerHTML = `
    <div class="zoom-scroll"><div class="zoom-stage"><div class="zoom-content">${html}</div></div></div>
    <button class="zoom-close round-btn" aria-label="${t('close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <p class="zoom-hint">${t('zoomHint')}</p>`;
  document.body.appendChild(el);
  document.body.classList.add('zoom-open');
  const scroll = el.querySelector<HTMLElement>('.zoom-scroll');
  const stage = el.querySelector<HTMLElement>('.zoom-stage');
  const content = el.querySelector<HTMLElement>('.zoom-content');
  if (!scroll || !stage || !content) return;

  const natural = { w: content.offsetWidth, h: content.offsetHeight };
  const minScale = (): number => Math.min(1, (scroll.clientWidth - 16) / natural.w);
  let scale = minScale();
  // Scale around a point (px in the scroll box) so it stays under the fingers.
  const apply = (next: number, cx = scroll.clientWidth / 2, cy = scroll.clientHeight / 2): void => {
    next = Math.max(minScale(), Math.min(MAX, next));
    const ux = (scroll.scrollLeft + cx) / scale;
    const uy = (scroll.scrollTop + cy) / scale;
    scale = next;
    content.style.transform = `scale(${scale})`;
    stage.style.width = `${natural.w * scale}px`;
    stage.style.height = `${natural.h * scale}px`;
    scroll.scrollLeft = ux * scale - cx;
    scroll.scrollTop = uy * scale - cy;
  };
  apply(scale);

  // Pinch: two touches; the browser keeps doing one-finger scrolling.
  let pinch: { d: number; s: number } | null = null;
  const dist = (e: TouchEvent): number => {
    const [a, b] = [e.touches[0], e.touches[1]];
    return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0;
  };
  const mid = (e: TouchEvent): [number, number] => {
    const r = scroll.getBoundingClientRect();
    const [a, b] = [e.touches[0], e.touches[1]];
    return a && b ? [(a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top] : [0, 0];
  };
  scroll.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) pinch = { d: dist(e), s: scale };
    },
    { passive: true },
  );
  scroll.addEventListener(
    'touchmove',
    (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      apply((pinch.s * dist(e)) / pinch.d, ...mid(e));
    },
    { passive: false },
  );
  scroll.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinch = null;
  });
  // Double-tap (or double-click): zoom in to read, or back out to the whole page.
  let lastTap = 0;
  const toggle = (x: number, y: number): void => {
    const r = scroll.getBoundingClientRect();
    apply(scale > minScale() + 0.05 ? minScale() : 1, x - r.left, y - r.top);
  };
  scroll.addEventListener('touchend', (e) => {
    if (e.touches.length || e.changedTouches.length !== 1) return;
    const now = Date.now();
    const p = e.changedTouches[0];
    if (p && now - lastTap < 300) {
      e.preventDefault();
      toggle(p.clientX, p.clientY);
      lastTap = 0;
    } else lastTap = now;
  });
  scroll.addEventListener('dblclick', (e) => toggle(e.clientX, e.clientY));

  const close = (): void => {
    el.remove();
    document.body.classList.remove('zoom-open');
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('hashchange', close);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  el.querySelector('.zoom-close')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('hashchange', close);
  el.querySelector<HTMLElement>('.zoom-close')?.focus({ preventScroll: true });
}
