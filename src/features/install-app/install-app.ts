// "Install the app" hint on the games list, while the app is open in the browser. Where the
// browser lets a page offer installing (Chrome, Edge, Samsung Internet: `beforeinstallprompt`),
// its button opens the browser's own install dialog. iPhones and iPads have no such API, so there
// the hint says how to do it from the Share menu. Closing it hides it for HINT_AGAIN_DAYS.
import { t } from '@/shared/i18n/i18n';
import { rerenderSoon } from '@/shared/lib/rerender';

/** Chrome's install event (not in TypeScript's DOM types). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLOSED_KEY = 'fut-academy-stats.installHintClosed'; // when the hint was last closed (ms)
export const HINT_AGAIN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InstallHint = 'prompt' | 'ios' | null;

/** Which hint to show: the install button, the iPhone steps, or none. */
export function installHint(o: {
  standalone: boolean;
  canPrompt: boolean;
  ios: boolean;
  closedAt: number | null;
  now: number;
}): InstallHint {
  if (o.standalone) return null; // already opened as an installed app
  if (o.closedAt != null && o.now - o.closedAt < HINT_AGAIN_DAYS * DAY_MS) return null;
  if (o.canPrompt) return 'prompt';
  return o.ios ? 'ios' : null;
}

let promptEvent: InstallPromptEvent | null = null;
let installed = false;

const isStandalone = (): boolean =>
  installed ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS says it's a Mac: tell them apart by the touch screen.
const isIos = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

function closedAt(): number | null {
  const v = Number(localStorage.getItem(CLOSED_KEY));
  return v > 0 ? v : null;
}

function close(): void {
  localStorage.setItem(CLOSED_KEY, String(Date.now()));
}

/** Listens for the browser saying the app can be (or was) installed (once, at startup). */
export function initInstallApp(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // our hint instead of the browser's own mini bar
    promptEvent = e as InstallPromptEvent;
    rerenderSoon();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    promptEvent = null;
    rerenderSoon();
  });
}

// iOS share icon: a box with an arrow going up.
const SHARE_ICON =
  '<svg class="install-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10H6v11h12V10h-2"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** The hint, or '' when there's nothing to suggest. */
export function installHintHtml(): string {
  const kind = installHint({
    standalone: isStandalone(),
    canPrompt: !!promptEvent,
    ios: isIos(),
    closedAt: closedAt(),
    now: Date.now(),
  });
  if (!kind) return '';
  const body =
    kind === 'prompt'
      ? `<p class="muted small">${t('installWhy')}</p>
         <button class="btn primary" data-action="install-app.install">${t('installBtn')}</button>`
      : `<p class="muted small">${t('installWhy')}</p>
         <p class="small">${t('installIosSteps', { icon: SHARE_ICON })}</p>`;
  return `<section class="install-hint" aria-labelledby="install-title">
    <img class="install-icon" src="icons/icon-192.png" alt="" width="44" height="44">
    <div class="grow">
      <strong id="install-title">${t('installTitle')}</strong>
      ${body}
    </div>
    <button class="install-close round-btn" data-action="install-app.later" aria-label="${t('installLater')}">${CLOSE_ICON}</button>
  </section>`;
}

/** Its actions (app/ registers them at startup). */
export const installAppActions = {
  'install-app.install': async () => {
    const e = promptEvent;
    if (!e) return;
    promptEvent = null; // the event can be used only once
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') installed = true;
    else close(); // "Not now" in the browser's dialog: ask again in a few days
    rerenderSoon();
  },
  'install-app.later': () => {
    close();
    rerenderSoon();
  },
};
