// The signed-in user's account (the `accounts` row: kind and admin flag), kept on the phone
// so Profile can show it offline. The sign-in screens themselves are UI (step 6).
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACCOUNT_KEY = 'fut-academy-stats.account';

/** `none`: signed in, but the admin hasn't given this email an account. */
export type Account = { email: string; kind: 'director' | 'coach'; isAdmin: boolean } | { none: true };

/** The account last seen on this phone, or null. */
export function storedAccount(): Account | null {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null') as Account | null;
  } catch {
    return null;
  }
}

export function storeAccount(account: Account | null): void {
  if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  else localStorage.removeItem(ACCOUNT_KEY);
}

/** Fetches the user's accounts row. Null when it couldn't be fetched (offline): keep what you had. */
export async function fetchAccount(client: SupabaseClient, userId: string): Promise<Account | null> {
  const { data, error } = await client
    .from('accounts')
    .select('email, kind, is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data ? { email: data.email, kind: data.kind, isAdmin: data.is_admin } : { none: true };
}
