// The cloud session: the Supabase client, who is signed in, their account (director/coach,
// admin), and whether this phone can sync. Sign-in is email + password; a code by email is used
// the first time and for a forgotten password, then the user chooses a password. Invite-only:
// the email gets a code only if the admin gave it an account. Everything else in the app keeps
// working without signing in.
import type { Session } from '@supabase/supabase-js';
import { route } from '@/shared/lib/route';
import { rerender, rerenderTabbar } from '@/shared/lib/rerender';
import { fetchAccount, managedClubs, storeAccount, storedAccount } from './auth';
import type { Account } from './auth';
import { getSupabase } from './supabase';
import { runSync } from './sync';

export const sb = getSupabase();

// mode: 'signin' (email + password) | 'signup' (create account) | 'reset' (forgot password).
// signup and reset are 3 steps: email -> code by email -> choose a password. `step` is
// 'email' or 'code'; after the code the user is signed in and must choose a password
// (`needsPassword`, kept across reloads so closing the app doesn't skip it; SETPW_KEY holds the
// mode for the step title).
export const SETPW_KEY = 'fut-academy-stats.setPassword';

export type SignInMode = 'signin' | 'signup' | 'reset';

export type CloudState = {
  session: Session | null;
  account: Account | null;
  mode: SignInMode;
  step: 'email' | 'code';
  email: string;
  busy: boolean;
  error: string;
  needsPassword: boolean;
  /** Which flow the "choose a password" step finishes (for its title). */
  pwMode: string;
  changingPassword: boolean;
  /** The saved session (if any) has been read: until then, don't show the sign-in screen. */
  authReady: boolean;
};

export const cloud: CloudState = {
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
  authReady: false,
};

/** Where supabase-js keeps the session on the phone (see data/supabase). */
export const AUTH_KEY = 'fut-academy-stats.auth';
const hasSavedSession = (): boolean => {
  try {
    return !!localStorage.getItem(AUTH_KEY);
  } catch {
    return false;
  }
};

/**
 * The app needs an account. What to show instead of the app, or null when signed in with access:
 * 'loading' (a saved session is being read, or the account isn't known yet), 'signin' (sign in /
 * activate account / choose a password), 'noaccess' (signed in, but the admin gave this email no
 * access).
 */
export type Gate = 'loading' | 'signin' | 'noaccess' | null;
export function signInGate(): Gate {
  if (!sb) return 'signin';
  if (!cloud.authReady) return hasSavedSession() ? 'loading' : 'signin';
  if (!cloud.session || cloud.needsPassword) return 'signin';
  if (!cloud.account) return 'loading';
  if ('none' in cloud.account) return 'noaccess';
  return null;
}
let lastGate: Gate = null;

/** Re-render account screens; elsewhere just refresh the tab bar (the Admin tab follows the account). */
export const renderIfProfile = (): void => {
  const gate = signInGate();
  const changed = gate !== lastGate;
  lastGate = gate;
  if (gate || changed || ['profile', 'admin'].includes(route().view)) rerender();
  else rerenderTabbar();
};

/** Fetch this user's accounts row (admin flag, clubs). Kept locally so Profile shows it offline. */
export async function refreshAccount(): Promise<void> {
  const userId = cloud.session?.user?.id;
  if (!sb || !userId) return;
  const account = await fetchAccount(sb, userId);
  if (!account) return; // offline or transient: keep what we had
  cloud.account = account;
  storeAccount(account);
  renderIfProfile();
}

/** The account, when it is a real one (not "signed in, but no account"). */
const realAccount = (): Exclude<Account, { none: true }> | null =>
  cloud.account && !('none' in cloud.account) ? cloud.account : null;

export const canSync = (): boolean => !!(sb && cloud.session && realAccount() && !cloud.needsPassword);
/** May create cloud teams: club managers (in their clubs) and the admin. */
export const canUpload = (): boolean => {
  const account = realAccount();
  return canSync() && !!account && (account.isAdmin || managedClubs(account).length > 0);
};

/**
 * Starts a sync (see data/sync.ts). Signed in but the account row couldn't be loaded yet
 * (offline at start): load it first.
 */
export function syncNow(): Promise<void> {
  if (sb && cloud.session && !cloud.account)
    return refreshAccount().then(() => (cloud.account ? syncNow() : undefined));
  return runSync();
}
