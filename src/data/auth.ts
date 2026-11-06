// The signed-in user's account (the `accounts` row and the clubs they belong to), kept on the
// phone so Profile can show it offline. The sign-in screens themselves are UI (step 6).
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACCOUNT_KEY = 'fut-academy-stats.account';

/** A club this user belongs to: as `manager` (UI: Coordenador) or `staff`. */
export type AccountClub = { id: string; name: string; shortName: string; role: 'manager' | 'staff' };

/** `none`: signed in, but the admin hasn't given this email an account. */
export type Account = { email: string; isAdmin: boolean; clubs: AccountClub[] } | { none: true };

/** Accounts stored by older versions had a `kind` and no clubs. */
function normalise(a: unknown): Account | null {
  if (!a || typeof a !== 'object') return null;
  const o = a as Record<string, unknown>;
  if (o.none === true) return { none: true };
  if (typeof o.email !== 'string') return null;
  return {
    email: o.email,
    isAdmin: o.isAdmin === true,
    clubs: Array.isArray(o.clubs) ? (o.clubs as AccountClub[]) : [],
  };
}

/** The account last seen on this phone, or null. */
export function storedAccount(): Account | null {
  try {
    return normalise(JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

export function storeAccount(account: Account | null): void {
  if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  else localStorage.removeItem(ACCOUNT_KEY);
}

type ClubRow = { id: string; name: string; short_name: string | null };

/**
 * Fetches the user's accounts row and clubs. Null when it couldn't be fetched (offline): keep
 * what you had.
 */
export async function fetchAccount(client: SupabaseClient, userId: string): Promise<Account | null> {
  const { data, error } = await client
    .from('accounts')
    .select('email, is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  if (!data) return { none: true };
  const mine = await client.from('club_members').select('club_id, role').eq('user_id', userId);
  if (mine.error) return null;
  const roles = new Map(
    (mine.data as { club_id: string; role: AccountClub['role'] }[]).map((m) => [m.club_id, m.role]),
  );
  let clubs: AccountClub[] = [];
  if (roles.size) {
    const rows = await client
      .from('clubs')
      .select('id, name, short_name')
      .in('id', [...roles.keys()]);
    if (rows.error) return null;
    clubs = (rows.data as ClubRow[])
      .map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.short_name ?? '',
        role: roles.get(c.id) ?? 'staff',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return { email: data.email as string, isAdmin: data.is_admin === true, clubs };
}

/** Clubs this account manages (UI: Coordenador). */
export const managedClubs = (account: Account | null): AccountClub[] =>
  account && !('none' in account) ? account.clubs.filter((c) => c.role === 'manager') : [];
