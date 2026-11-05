// The cloud session: the Supabase client, who is signed in, their account (director/coach,
// admin), and whether this phone can sync. Sign-in is email + password; a code by email is used
// the first time and for a forgotten password, then the user chooses a password. Invite-only:
// the email gets a code only if the admin gave it an account. Everything else in the app keeps
// working without signing in.
// @ts-nocheck -- moved as is (the sign-in form state lives here too, for now); typed in step 8.
import { route } from '@/shared/lib/route';
import { rerender, rerenderTabbar } from '@/shared/lib/rerender';
import { fetchAccount, storeAccount, storedAccount } from './auth';
import { getSupabase } from './supabase';
import { runSync } from './sync';

export const sb = getSupabase();

// mode: 'signin' (email + password) | 'signup' (create account) | 'reset' (forgot password).
// signup and reset are 3 steps: email -> code by email -> choose a password. `step` is
// 'email' or 'code'; after the code the user is signed in and must choose a password
// (`needsPassword`, kept across reloads so closing the app doesn't skip it; SETPW_KEY holds the
// mode for the step title).
export const SETPW_KEY = 'fut-academy-stats.setPassword';
export const cloud = {
  session: null,
  account: storedAccount(),
  mode: 'signin',
  step: 'email',
  email: '',
  busy: false,
  error: '',
  needsPassword: !!localStorage.getItem(SETPW_KEY),
  pwMode: localStorage.getItem(SETPW_KEY) || 'signup',
  changingPassword: false,
};

/** Re-render account screens; elsewhere just refresh the tab bar (the Admin tab follows the account). */
export const renderIfProfile = () => {
  if (['profile', 'admin'].includes(route().view)) rerender();
  else rerenderTabbar();
};

/** Fetch this user's accounts row (kind, admin). Kept locally so Profile shows it offline. */
export async function refreshAccount() {
  const userId = cloud.session?.user?.id;
  if (!sb || !userId) return;
  const account = await fetchAccount(sb, userId);
  if (!account) return; // offline or transient: keep what we had
  cloud.account = account;
  storeAccount(account);
  renderIfProfile();
}

export const canSync = () =>
  !!(sb && cloud.session && cloud.account && !cloud.account.none && !cloud.needsPassword);
export const canUpload = () => canSync() && (cloud.account.kind === 'director' || cloud.account.isAdmin);

/**
 * Starts a sync (see data/sync.ts). Signed in but the account row couldn't be loaded yet
 * (offline at start): load it first.
 */
export function syncNow() {
  if (sb && cloud.session && !cloud.account)
    return refreshAccount().then(() => (cloud.account ? syncNow() : undefined));
  return runSync();
}
