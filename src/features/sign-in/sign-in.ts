// Signing in: the Account section on Profile (sign in, activate an account, reset the
// password, choose a password) and following the Supabase session.
import { SETPW_KEY, canSync, cloud, refreshAccount, renderIfProfile, sb, syncNow } from '@/data/session';
import { toast } from '@/shared/ui/toast';
import { storeAccount } from '@/data/auth';
import { pendingCount, removeCloudData } from '@/data/sync';
import { esc } from '@/shared/lib/html';
import { t } from '@/shared/i18n/i18n';
import type { SupabaseClient } from '@supabase/supabase-js';

/** The Supabase client; the sign-in forms only show when there is one (see accountSectionBody). */
const auth = (): SupabaseClient['auth'] => {
  if (!sb) throw new Error(t('cloudUnavailable'));
  return sb.auth;
};

// ---------- Cloud account (Supabase sign-in) ----------
// Sign-in is email + password; a code by email is used the first time and for a forgotten
// password, then the user chooses a password. Invite-only: the email gets a code only if the
// admin gave it an account; `shouldCreateUser: false` never creates users. Everything else in
// the app keeps working without signing in.

/** Follows the Supabase session: who is signed in, and what to do on sign-in and sign-out. */
export function watchAuth(): void {
  if (!sb) return;
  sb.auth.getSession().then(({ data }) => {
    cloud.session = data.session;
    if (cloud.session) refreshAccount().finally(syncNow);
    renderIfProfile();
  });
  sb.auth.onAuthStateChange((event, session) => {
    cloud.session = session;
    if (!session) {
      cloud.account = null;
      storeAccount(null);
    }
    // Signed out (here or because the session ended): the cloud teams leave this phone, unless
    // changes are still waiting; those are kept until this user signs in again (another user
    // signing in removes them first, see syncOnce).
    if (event === 'SIGNED_OUT' && !pendingCount()) removeCloudData();
    // Supabase advises against calling it again from inside this callback.
    if (event === 'SIGNED_IN') setTimeout(() => refreshAccount().finally(syncNow));
    renderIfProfile();
  });
}

/** Anything an auth call can throw: AuthError, a plain Error, or something else. */
type AuthFailure = { code?: string; message?: string; name?: string; status?: number } | null | undefined;

export function authMessage(e: unknown): string {
  const error = e as AuthFailure;
  const msg = `${error?.code || ''} ${error?.message || ''}`;
  if (!navigator.onLine || error?.name === 'AuthRetryableFetchError' || error?.status === 0)
    return t('authOffline');
  if (error?.status === 429 || /rate.?limit/i.test(msg)) return t('authRateLimit');
  if (/otp_disabled|signup_disabled|user_not_found|signups not allowed/i.test(msg)) return t('authNoAccess');
  if (/invalid_credentials|invalid login credentials/i.test(msg)) return t('authBadPassword');
  if (/same_password|should be different/i.test(msg)) return t('pwSame');
  if (/weak_password|password should|weak/i.test(msg)) return t('pwWeak');
  if (/otp_expired|invalid|expired/i.test(msg)) return t('authBadCode');
  if (e instanceof Error && !error?.status && !error?.code && !e.name.startsWith('Auth'))
    return esc(e.message);
  return t('authFailed', { msg: esc(error?.message || String(e)) });
}

export async function cloudStep(fn: () => Promise<void>): Promise<void> {
  cloud.busy = true;
  cloud.error = '';
  renderIfProfile();
  try {
    await fn();
  } catch (e) {
    cloud.error = authMessage(e);
  }
  cloud.busy = false;
  renderIfProfile();
}

export const sendCode = (email: string): Promise<void> =>
  cloudStep(async () => {
    const { error } = await auth().signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw error;
    Object.assign(cloud, { step: 'code', email });
  });

export const verifyCode = (token: string): Promise<void> =>
  cloudStep(async () => {
    const { error } = await auth().verifyOtp({ email: cloud.email, token, type: 'email' });
    if (error) throw error;
    // Signed in with a code: first time or forgotten password, so a password is chosen next.
    const pwMode = cloud.mode === 'reset' ? 'reset' : 'signup';
    localStorage.setItem(SETPW_KEY, pwMode);
    Object.assign(cloud, { mode: 'signin', step: 'email', needsPassword: true, pwMode });
  });

export const signInPassword = (email: string, password: string): Promise<void> =>
  cloudStep(async () => {
    cloud.email = email; // kept if it fails (the form is drawn again), e.g. for "get a code"
    const { error } = await auth().signInWithPassword({ email, password });
    if (error) throw error;
    Object.assign(cloud, { mode: 'signin', step: 'email', email: '' });
    toast(t('signedIn'));
  });

// Supabase Auth stores only a bcrypt hash of the password (in auth.users); the app never keeps it.
export const setPassword = (pw: string, pw2: string): Promise<void> =>
  cloudStep(async () => {
    if (pw.length < 8) throw new Error(t('pwShort'));
    if (pw !== pw2) throw new Error(t('pwMismatch'));
    const { error } = await auth().updateUser({ password: pw });
    if (error) throw error;
    const wasNew = cloud.needsPassword;
    localStorage.removeItem(SETPW_KEY);
    Object.assign(cloud, { needsPassword: false, changingPassword: false, email: '' });
    toast(wasNew ? t('signedIn') : t('pwSaved'));
    if (wasNew) setTimeout(syncNow); // sync was held back until the password was chosen
  });

export function setPasswordForm(busy: string, err: string, cancel: boolean): string {
  const step3 = cloud.needsPassword;
  return `${step3 ? `<p class="step-label">${t('stepOf', { n: 3 })}</p>` : ''}
    <h3 class="sub-title">${step3 ? t('stepPassword') : t('changePassword')}</h3>
    <p class="hint">${t('setPwHint')}</p>
    <form class="form" data-form="set-password">
      <input type="email" name="username" autocomplete="username" value="${esc(cloud.session?.user.email ?? '')}" hidden>
      <label>${t('newPassword')}<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
      <label>${t('repeatPassword')}<input name="password2" type="password" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary" ${busy}>${step3 && cloud.pwMode === 'signup' ? t('createAccount') : t('savePassword')}</button>
      ${cancel ? `<button type="button" class="btn ghost" data-action="cancel-password">${t('cancel')}</button>` : ''}
    </form>${err}`;
}

/** The Account section; `syncStatus` is the sync status line (HTML) shown when signed in. */
export function accountSection(syncStatus = ''): string {
  return `${accountSectionBody(syncStatus)}<p class="hint"><button class="link-btn" data-action="privacy">${t('privacyLink')}</button></p>`;
}

export function accountSectionBody(syncStatus = ''): string {
  const head = '';
  if (!sb) return `${head}<p class="hint">${t('cloudUnavailable')}</p>`;
  const err = cloud.error ? `<p class="hint warn" role="alert">${cloud.error}</p>` : '';
  const busy = cloud.busy ? 'disabled' : '';
  if (cloud.session && cloud.needsPassword) {
    // Step 3 of "Activate account" / "Reset your password": nothing else until it's done.
    return `${head}<section class="auth-steps">${cloud.pwMode === 'reset' ? `<p class="muted small">${t('resetTitle')}</p>` : ''}
      ${setPasswordForm(busy, err, false)}</section>`;
  }
  if (cloud.session) {
    const a = cloud.account;
    const email = cloud.session.user.email ?? '';
    const kind =
      a && !('none' in a)
        ? [
            a.isAdmin ? esc(t('acctAdmin')) : '',
            ...a.clubs.map(
              (c) => `${esc(c.name)} · ${t(c.role === 'manager' ? 'clubManager' : 'clubStaff')}`,
            ),
          ]
            .filter(Boolean)
            .join('<br>')
        : '';
    return `${head}
      <ul class="list settings">
        <li class="item"><span class="grow"><strong class="acct-email" title="${esc(email)}">${esc(email)}</strong>${kind ? `<div class="muted small">${kind}</div>` : ''}</span></li>
        ${
          canSync()
            ? `<li class="item"><span class="grow muted small" id="sync-status" aria-live="polite">${syncStatus}</span>
          <button class="btn small ghost" data-action="sync-now">${t('syncNow')}</button></li>`
            : ''
        }
      </ul>
      ${a && 'none' in a ? `<p class="hint warn">${t('acctNone')}</p>` : ''}
      ${
        cloud.changingPassword
          ? setPasswordForm(busy, err, true)
          : `${err}<div class="row gap wrap acct-actions">
            <button class="btn small ghost" data-action="change-password">${t('changePassword')}</button>
            <button class="btn small ghost" data-action="sign-out">${t('signOut')}</button></div>`
      }`;
  }
  const tabs =
    cloud.mode === 'reset'
      ? ''
      : `<div class="seg big auth-tabs" role="tablist">
      <button role="tab" class="${cloud.mode === 'signin' ? 'on' : ''}" aria-selected="${cloud.mode === 'signin'}" data-action="auth-mode" data-v="signin" ${busy}>${t('tabSignIn')}</button>
      <button role="tab" class="${cloud.mode === 'signup' ? 'on' : ''}" aria-selected="${cloud.mode === 'signup'}" data-action="auth-mode" data-v="signup" ${busy}>${t('tabSignUp')}</button>
    </div>`;
  if (cloud.mode === 'signin') {
    return `${head}${tabs}
      <p class="hint">${t('accountHint')}</p>
      <form class="form" data-form="signin-password">
        <label>${t('email')}<input name="email" type="email" required autocomplete="username" inputmode="email" value="${esc(cloud.email)}"></label>
        <label>${t('password')}<input name="password" type="password" required autocomplete="current-password"></label>
        <button class="btn primary" ${busy}>${t('signInPw')}</button>
      </form>
      ${err}
      <p class="hint"><button class="link-btn" data-action="auth-mode" data-v="reset" ${busy}>${t('forgotPassword')}</button></p>`;
  }
  // signup / reset: step 1 (email) or step 2 (code)
  const title = cloud.mode === 'reset' ? `<h3 class="sub-title">${t('resetTitle')}</h3>` : '';
  const intro = cloud.mode === 'reset' ? t('resetIntro') : t('signUpIntro');
  const back =
    cloud.mode === 'reset'
      ? `<p class="hint"><button class="link-btn" data-action="auth-mode" data-v="signin" ${busy}>${t('backToSignIn')}</button></p>`
      : '';
  if (cloud.step === 'code') {
    return `${head}${tabs}<section class="auth-steps">${title}
      <p class="step-label">${t('stepOf', { n: 2 })}</p>
      <p class="hint">${t('codeSent', { email: `<b>${esc(cloud.email)}</b>` })}</p>
      <form class="form" data-form="signin-code">
        <label>${t('stepCode')}<input name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10"></label>
        <button class="btn primary" ${busy}>${t('confirmCode')}</button>
      </form>
      ${err}
      <div class="row gap wrap signin-links">
        <button class="btn small ghost" data-action="signin-back" ${busy}>${t('otherEmail')}</button>
        <button class="btn small ghost" data-action="signin-resend" ${busy}>${t('resendCode')}</button>
      </div></section>${back}`;
  }
  return `${head}${tabs}<section class="auth-steps">${title}
    ${intro ? `<p class="hint">${intro}</p>` : ''}
    <p class="step-label">${t('stepOf', { n: 1 })}</p>
    <form class="form" data-form="signin-email">
      <label>${t('stepEmail')}<input name="email" type="email" required autocomplete="email" inputmode="email" value="${esc(cloud.email)}"></label>
      <button class="btn primary" ${busy}>${t('sendCode')}</button>
    </form>
    ${err}</section>${back}`;
}
