import { onLeave } from '@/shared/lib/route';
// The Profile page: account, settings (language, theme) and backup.
import { $ } from '@/shared/lib/dom';
import { sb, syncNow } from '@/data/session';
import { db } from '@/data/store';
import { pendingCount, removeCloudData } from '@/data/sync';
import { switchLanguage } from '@/features/language-switch/language';
import { sendCode } from '@/features/sign-in/sign-in';
import { setTheme } from '@/features/theme-switch/theme';
import { plural } from '@/shared/i18n/i18n';
import { rerender } from '@/shared/lib/rerender';
import { askConfirm } from '@/shared/ui/dialog';
import { openSheet } from '@/shared/ui/sheet';
import { getTheme } from '@/features/theme-switch/theme';
import { accountSection } from '@/features/sign-in/sign-in';
import { syncStatusText } from '@/features/sync-status/sync-status';
import { cloud } from '@/data/session';
import { bar } from '@/shared/ui/bar';
import { esc } from '@/shared/lib/html';
import { getLang, t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';
import type { SignInMode } from '@/data/session';
import type { Lang } from '@/domain/types';
import type { ThemeChoice } from '@/features/theme-switch/theme';

// ---------- Views: profile / settings ----------
// App settings live here; add new sections as more settings appear.

// Profile is an accordion: Account, Settings, Backup. One section open at a time (Account by
// default, every time the app starts); each closed header shows a one-line summary. While
// creating an account / choosing a password, Account stays open.
export let profileOpen = 'account';
// Back to the default (Account open) whenever the screen is left.
onLeave(() => {
  profileOpen = 'account';
});

export function viewProfile(): void {
  const seg = (action: string, current: string, options: [string, string][]): string =>
    `<span class="seg big" role="group">${options
      .map(
        ([v, label]) =>
          `<button class="${current === v ? 'on' : ''}" data-action="${action}" data-v="${v}" aria-pressed="${current === v}">${label}</button>`,
      )
      .join('')}</span>`;
  const busyAuth = cloud.needsPassword || cloud.step === 'code';
  const open = busyAuth ? 'account' : profileOpen;
  const a = cloud.account;
  const accountSum = cloud.session
    ? cloud.needsPassword
      ? t('stepOf', { n: 3 })
      : [
          cloud.session.user.email,
          a &&
            !('none' in a) &&
            (a.isAdmin
              ? t('acctAdmin')
              : a.clubs.some((c) => c.role === 'manager')
                ? t('clubManager')
                : a.clubs[0]?.name),
        ]
          .filter(Boolean)
          .join(' · ')
    : t('notSignedIn');
  const themeLabel = { light: t('themeLight'), dark: t('themeDark'), auto: t('themeAuto') }[getTheme()];
  const section = (id: string, title: string, summary: string, body: string): string => `
    <section class="acc ${open === id ? 'open' : ''}">
      <button class="acc-head" data-action="profile-section" data-v="${id}" aria-expanded="${open === id}" aria-controls="acc-${id}">
        <span class="grow"><span class="acc-title">${title}</span><span class="acc-sum">${esc(summary)}</span></span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <div class="acc-body" id="acc-${id}" ${open === id ? '' : 'hidden'}>${body}</div>
    </section>`;
  main.innerHTML = `
    ${bar(t('tabProfile'))}
    <div class="accordion">
    ${section('account', t('account'), accountSum, accountSection(syncStatusText()))}
    ${section(
      'settings',
      t('settings'),
      `${getLang() === 'pt' ? 'Português' : 'English'} · ${themeLabel}`,
      `
      <ul class="list settings">
        <li class="item"><span class="grow">${t('language')}</span>
          ${seg('lang', getLang(), [
            ['en', 'English'],
            ['pt', 'Português'],
          ])}</li>
        <li class="item wrap"><span class="grow">${t('theme')}</span>
          ${seg('theme', getTheme(), [
            ['light', `☀️ ${t('themeLight')}`],
            ['dark', `🌙 ${t('themeDark')}`],
            ['auto', t('themeAuto')],
          ])}</li>
      </ul>`,
    )}
    </div>`;
}

export const profileActions = {
  privacy: () =>
    openSheet(`<h3>${t('privacyTitle')}</h3><div class="privacy">${t('privacyBody')}</div>
    <button class="btn block" data-action="close-sheet">${t('ok')}</button>`),
  'signin-back': () => {
    Object.assign(cloud, { step: 'email', error: '' });
    rerender();
  },
  'profile-section': ({ v = '' }: DOMStringMap) => {
    profileOpen = profileOpen === v ? '' : v; // tap the open one to close it
    rerender();
  },
  'auth-mode': ({ v }: DOMStringMap) => {
    // Keep a typed email when switching between Sign in / Activate account / Reset.
    const typed = ($('main input[name="email"]') as HTMLInputElement | null)?.value.trim();
    Object.assign(cloud, { mode: v as SignInMode, step: 'email', error: '', email: typed || cloud.email });
    rerender();
  },
  'change-password': () => {
    Object.assign(cloud, { changingPassword: true, error: '' });
    rerender();
  },
  'cancel-password': () => {
    Object.assign(cloud, { changingPassword: false, error: '' });
    rerender();
  },
  'signin-resend': () => void sendCode(cloud.email),
  'sign-out': async () => {
    const n = pendingCount();
    const message = [
      t('signOutConfirm'),
      Object.keys(db.sync.teams).length ? t('signOutCloud') : '',
      n ? `<b>${plural('signOutLose', n)}</b>` : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (!(await askConfirm({ title: t('signOut'), message, ok: t('signOut'), danger: n > 0 }))) return;
    removeCloudData(); // cloud teams leave this phone; teams on this phone stay
    await sb?.auth.signOut({ scope: 'local' }); // local: works offline too
    rerender();
  },
  'sync-now': () => void syncNow(),
  theme: ({ v }: DOMStringMap) => {
    setTheme(v as ThemeChoice);
    rerender();
  },
  lang: ({ v }: DOMStringMap) => {
    switchLanguage(v as Lang);
    rerender();
  },
};

/** The Profile page: its screen and actions (app/ registers them at startup). */
export const profilePage = { views: { profile: viewProfile }, actions: profileActions };
