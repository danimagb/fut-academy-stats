import { beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ACCOUNT_KEY, fetchAccount, managedClubs, storeAccount, storedAccount } from './auth';

type Row = Record<string, unknown>;

/** Just enough of supabase-js for fetchAccount: select().eq().maybeSingle() / select().eq() / select().in(). */
function client(tables: Record<string, Row[]>, failOn = ''): SupabaseClient {
  const from = (table: string) => ({
    select: () => {
      const result = (rows: Row[]) =>
        Promise.resolve(
          table === failOn ? { data: null, error: { message: 'offline' } } : { data: rows, error: null },
        );
      return {
        eq: (col: string, v: unknown) => {
          const rows = (tables[table] ?? []).filter((r) => r[col] === v);
          return Object.assign(result(rows), {
            maybeSingle: () =>
              Promise.resolve(
                table === failOn
                  ? { data: null, error: { message: 'offline' } }
                  : { data: rows[0] ?? null, error: null },
              ),
          });
        },
        in: (col: string, vs: unknown[]) => result((tables[table] ?? []).filter((r) => vs.includes(r[col]))),
      };
    },
  });
  return { from } as unknown as SupabaseClient;
}

const U = 'u1';
const tables = (): Record<string, Row[]> => ({
  accounts: [{ user_id: U, email: 'u@example.com', is_admin: false }],
  club_members: [
    { club_id: 'c2', user_id: U, role: 'staff' },
    { club_id: 'c1', user_id: U, role: 'manager' },
    { club_id: 'c1', user_id: 'other', role: 'staff' },
  ],
  clubs: [
    { id: 'c1', name: 'Padroense FC', short_name: 'PFC' },
    { id: 'c2', name: 'Académico', short_name: null },
    { id: 'c3', name: 'Not mine', short_name: '' },
  ],
});

describe('account', () => {
  beforeEach(() => localStorage.clear());

  it('fetches the account with its clubs, sorted by name', async () => {
    const a = await fetchAccount(client(tables()), U);
    expect(a).toEqual({
      email: 'u@example.com',
      isAdmin: false,
      clubs: [
        { id: 'c2', name: 'Académico', shortName: '', role: 'staff' },
        { id: 'c1', name: 'Padroense FC', shortName: 'PFC', role: 'manager' },
      ],
    });
    expect(managedClubs(a).map((c) => c.id)).toEqual(['c1']);
  });

  it('says when there is no account, and gives up (null) when offline', async () => {
    expect(await fetchAccount(client({ ...tables(), accounts: [] }), U)).toEqual({ none: true });
    expect(await fetchAccount(client(tables(), 'accounts'), U)).toBeNull();
    expect(await fetchAccount(client(tables(), 'clubs'), U)).toBeNull();
  });

  it('reads an account stored by an older version (kind, no clubs)', () => {
    localStorage.setItem(
      ACCOUNT_KEY,
      JSON.stringify({ email: 'u@example.com', kind: 'director', isAdmin: true }),
    );
    expect(storedAccount()).toEqual({ email: 'u@example.com', isAdmin: true, clubs: [] });
    storeAccount({ none: true });
    expect(storedAccount()).toEqual({ none: true });
    localStorage.setItem(ACCOUNT_KEY, '{bad');
    expect(storedAccount()).toBeNull();
    expect(managedClubs(null)).toEqual([]);
  });
});
