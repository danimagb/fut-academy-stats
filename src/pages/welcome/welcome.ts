// The welcome screen: what the app shows until someone is signed in with access (the app needs an
// account). The app's name, then Sign in / Activate account right there; no tab bar.
import { cloud, signInGate } from '@/data/session';
import { accountSectionBody } from '@/features/sign-in/sign-in';
import { esc } from '@/shared/lib/html';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';

export function viewWelcome(): void {
  const gate = signInGate();
  const body =
    gate === 'loading'
      ? `<p class="hint welcome-wait">${t('loading')}</p>`
      : gate === 'noaccess'
        ? `<p class="hint warn">${t('acctNone')}</p>
          <p class="muted small">${esc(cloud.session?.user.email ?? '')}</p>
          <button class="btn ghost block" data-action="sign-out">${t('signOut')}</button>`
        : accountSectionBody();
  main.innerHTML = `
    <section class="welcome">
      <header class="welcome-brand">
        <img src="icons/icon.svg" alt="" width="72" height="72">
        <h1>Fut Academy Stats</h1>
        <p class="muted">${t('welcomeTagline')}</p>
      </header>
      <div class="welcome-account">${body}</div>
      <p class="hint welcome-privacy"><button class="link-btn" data-action="privacy">${t('privacyLink')}</button></p>
    </section>`;
}
