// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// The Profile page: account, settings (language, theme) and backup. Moved from app/legacy.js.
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
import { persistedState } from '@/data/persist';
import { esc } from '@/shared/lib/html';
import { getLang, t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';

// ---------- Views: profile / settings ----------
// App settings live here; add new sections as more settings appear.

// Profile is an accordion: Account, Settings, Backup. One section open at a time (Account by
// default, every time the app starts); each closed header shows a one-line summary. While
// creating an account / choosing a password, Account stays open.
export let profileOpen = 'account';

export function viewProfile() {
  const seg = (action, current, options) =>
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
            !a.none &&
            (a.isAdmin ? t('acctAdmin') : t(a.kind === 'director' ? 'acctDirector' : 'acctCoach')),
        ]
          .filter(Boolean)
          .join(' · ')
    : t('notSignedIn');
  const themeLabel = { light: t('themeLight'), dark: t('themeDark'), auto: t('themeAuto') }[getTheme()];
  const section = (id, title, summary, body) => `
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
    ${section(
      'backup',
      t('backupTitle'),
      t('backupSummary'),
      `
      <p class="hint">${t('backupHint')}</p>
      ${persistedState() === null ? '' : `<p class="hint ${persistedState() ? 'ok' : 'warn'}">${persistedState() ? `✓ ${t('storageKept')}` : t('storageNotKept')}</p>`}
      <div class="row gap">
        <button class="btn grow" data-action="backup">⬇️ ${t('exportBackup')}</button>
        <label class="btn grow">⬆️ ${t('importBackup')}<input type="file" accept="application/json,.json" data-change="restore" hidden></label>
      </div>`,
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
  'profile-section': ({ v }) => {
    profileOpen = profileOpen === v ? '' : v; // tap the open one to close it
    rerender();
  },
  'auth-mode': ({ v }) => {
    // Keep a typed email when switching between Sign in / Activate account / Reset.
    const typed = $('main input[name="email"]')?.value.trim();
    Object.assign(cloud, { mode: v, step: 'email', error: '', email: typed || cloud.email });
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
  'signin-resend': () => sendCode(cloud.email),
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
    await sb.auth.signOut({ scope: 'local' }); // local: works offline too
    rerender();
  },
  'sync-now': () => syncNow(),
  theme: ({ v }) => {
    setTheme(v);
    rerender();
  },
  lang: ({ v }) => {
    switchLanguage(v);
    rerender();
  },
};

/** The Profile page: its screen and actions (app/ registers them at startup). */
export const profilePage = { views: { profile: viewProfile }, actions: profileActions };
