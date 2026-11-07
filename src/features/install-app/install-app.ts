// "Install the app" hint on the games list, while the app is open in the browser. Where the
// browser lets a page offer installing (Chrome, Edge, Samsung Internet: `beforeinstallprompt`),
// its button opens the browser's own install dialog. iPhones, iPads and Firefox on Android have
// no such API: there its button opens step-by-step instructions (the pwa-install component,
// loaded only then). Closing the hint hides it for HINT_AGAIN_DAYS.
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

export type InstallHint = 'prompt' | 'howto' | null;

/** Which hint to show: the install button, the how-to-install button, or none. */
export function installHint(o: {
  standalone: boolean;
  canPrompt: boolean;
  /** A browser that can add the app to the home screen only from its own menus (iPhone, Firefox). */
  menuOnly: boolean;
  closedAt: number | null;
  now: number;
}): InstallHint {
  if (o.standalone) return null; // already opened as an installed app
  if (o.closedAt != null && o.now - o.closedAt < HINT_AGAIN_DAYS * DAY_MS) return null;
  if (o.canPrompt) return 'prompt';
  return o.menuOnly ? 'howto' : null;
}

let promptEvent: InstallPromptEvent | null = null;
let installed = false;

const isStandalone = (): boolean =>
  installed ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS says it's a Mac: tell them apart by the touch screen.
const isMenuOnly = (): boolean => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios || (ua.includes('Android') && ua.includes('Firefox/'));
};

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

const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** The hint, or '' when there's nothing to suggest. */
export function installHintHtml(): string {
  const kind = installHint({
    standalone: isStandalone(),
    canPrompt: !!promptEvent,
    menuOnly: isMenuOnly(),
    closedAt: closedAt(),
    now: Date.now(),
  });
  if (!kind) return '';
  const button =
    kind === 'prompt'
      ? `<button class="btn primary" data-action="install-app.install">${t('installBtn')}</button>`
      : `<button class="btn primary" data-action="install-app.how">${t('installHow')}</button>`;
  return `<section class="install-hint" aria-labelledby="install-title">
    <img class="install-icon" src="icons/icon-192.png" alt="" width="44" height="44">
    <div class="grow">
      <strong id="install-title">${t('installTitle')}</strong>
      <p class="muted small">${t('installWhy')}</p>
      ${button}
    </div>
    <button class="install-close round-btn" data-action="install-app.later" aria-label="${t('installLater')}">${CLOSE_ICON}</button>
  </section>`;
}

/** The pwa-install component's few members used here (its own types need its `lit` types). */
interface HowToDialog extends HTMLElement {
  readonly updateComplete: Promise<boolean>;
  showDialog(forced?: boolean): void;
}
let howTo: HowToDialog | null = null;
let howToLang = ''; // it reads the language once: made again when the app's language changed

/** Shows the browser's install steps (iPhone: Share → Add to Home Screen), with pictures. */
async function showHowTo(): Promise<void> {
  if (howTo && howToLang !== document.documentElement.lang) {
    howTo.remove();
    howTo = null;
  }
  if (!howTo) {
    await import('@khmyznikov/pwa-install'); // defines <pwa-install> (a separate, precached file)
    const el = document.createElement('pwa-install') as HowToDialog;
    // Opened only from our button; its own "don't show again" is ours (HINT_AGAIN_DAYS).
    el.setAttribute('manual-apple', '');
    el.setAttribute('manual-chrome', '');
    el.setAttribute('manual-how-to', ''); // straight to the steps
    el.setAttribute('manifest-url', 'manifest.webmanifest');
    el.setAttribute('description', t('installTagline'));
    el.setAttribute('install-description', t('installWhy'));
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    el.setAttribute('styles', JSON.stringify({ '--tint-color': accent }));
    document.body.append(el);
    await el.updateComplete;
    howTo = el;
    howToLang = document.documentElement.lang;
  }
  howTo.showDialog(true);
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
  'install-app.how': () => showHowTo(),
  'install-app.later': () => {
    close();
    rerenderSoon();
  },
};
