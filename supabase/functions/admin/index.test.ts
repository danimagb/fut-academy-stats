// Unit tests for the admin Edge Function, against an in-memory stand-in for the service-role
// client. Run: npx deno@2 test --allow-env --no-lock supabase/functions/admin/
import { assertEquals } from 'jsr:@std/assert@1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

// index.ts starts a server when loaded: replace Deno.serve before importing it.
(Deno as unknown as { serve: unknown }).serve = () => ({});
Deno.env.set('SUPABASE_URL', 'http://localhost');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key'); // not used: every test passes its own client
const { handle } = await import('./index.ts');

type Row = Record<string, unknown>;
const ADMIN = '00000000-0000-0000-0000-0000000000ad';
const OTHER = '00000000-0000-0000-0000-0000000000b0';

function fake(tables: Record<string, Row[]>, users: { id: string; email: string }[] = []) {
  const db: Record<string, Row[]> = { accounts: [], clubs: [], club_members: [], ...tables };
  let nextId = 1;
  const client = {
    auth: {
      getUser: (jwt: string) =>
        Promise.resolve(
          jwt === 'admin-token'
            ? { data: { user: { id: ADMIN } }, error: null }
            : jwt === 'other-token'
              ? { data: { user: { id: OTHER } }, error: null }
              : { data: { user: null }, error: { message: 'bad jwt' } },
        ),
      admin: {
        listUsers: () => Promise.resolve({ data: { users }, error: null }),
        createUser: ({ email }: { email: string }) => {
          const user = { id: `00000000-0000-0000-0000-${String(nextId++).padStart(12, '0')}`, email };
          users.push(user);
          return Promise.resolve({ data: { user }, error: null });
        },
        deleteUser: (id: string) => {
          db.accounts = db.accounts.filter((a) => a.user_id !== id);
          db.club_members = db.club_members.filter((m) => m.user_id !== id);
          return Promise.resolve({ error: null });
        },
      },
    },
    from(table: string) {
      const rows = (db[table] ??= []);
      return {
        select: () => ({
          eq: (col: string, value: unknown) => ({
            maybeSingle: () => Promise.resolve({ data: rows.find((r) => r[col] === value) ?? null, error: null }),
          }),
        }),
        insert: (row: Row) => {
          if (rows.some((r) => r.user_id === row.user_id))
            return Promise.resolve({ error: { code: '23505', message: 'duplicate' } });
          rows.push(row);
          return Promise.resolve({ error: null });
        },
        upsert: (row: Row) => {
          const i = rows.findIndex((r) => r.club_id === row.club_id && r.user_id === row.user_id);
          if (i >= 0) rows[i] = { ...rows[i], ...row };
          else rows.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, db, users };
}

const call = (client: SupabaseClient, body: unknown, token = 'admin-token') =>
  handle(
    new Request('http://localhost/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    client,
  ).then(async (r) => ({ status: r.status, body: await r.json() }));

const base = () =>
  fake({
    accounts: [{ user_id: ADMIN, email: 'admin@example.com', is_admin: true }],
    clubs: [{ id: 'c1', name: 'Padroense FC' }],
  });

Deno.test('create_account: a new email gets an account and a role in the club', async () => {
  const f = base();
  const r = await call(f.client, { action: 'create_account', email: ' New@Example.com ', club_id: 'c1', role: 'manager' });
  assertEquals(r.status, 200);
  assertEquals(r.body.existed, false);
  assertEquals(f.db.accounts.find((a) => a.email === 'new@example.com')?.user_id, r.body.user_id);
  assertEquals(f.db.club_members, [{ club_id: 'c1', user_id: r.body.user_id, role: 'manager', invited_by: ADMIN }]);
  assertEquals('kind' in f.db.accounts[1], false);
});

Deno.test('create_account: an email that already has access is added to the club', async () => {
  const f = base();
  f.db.accounts.push({ user_id: OTHER, email: 'old@example.com', is_admin: false });
  const r = await call(f.client, { action: 'create_account', email: 'old@example.com', club_id: 'c1', role: 'staff' });
  assertEquals(r.status, 200);
  assertEquals(r.body, { ok: true, user_id: OTHER, existed: true });
  assertEquals(f.db.club_members.length, 1);
  const again = await call(f.client, { action: 'create_account', email: 'old@example.com', club_id: 'c1', role: 'manager' });
  assertEquals(again.status, 200);
  assertEquals(f.db.club_members.map((m) => m.role), ['manager']);
});

Deno.test('create_account: reuses an auth user created in the dashboard', async () => {
  const f = fake(
    { accounts: [{ user_id: ADMIN, email: 'admin@example.com', is_admin: true }], clubs: [{ id: 'c1', name: 'X' }] },
    [{ id: OTHER, email: 'dash@example.com' }],
  );
  const r = await call(f.client, { action: 'create_account', email: 'dash@example.com', club_id: 'c1', role: 'staff' });
  assertEquals(r.body.user_id, OTHER);
  assertEquals(f.users.length, 1);
});

Deno.test('create_account: checks email, club and role', async () => {
  const f = base();
  assertEquals((await call(f.client, { action: 'create_account', email: 'x', club_id: 'c1', role: 'staff' })).body.error, 'invalid_email');
  assertEquals((await call(f.client, { action: 'create_account', email: 'a@b.pt', club_id: 'c1', role: 'coach' })).body.error, 'invalid_role');
  assertEquals((await call(f.client, { action: 'create_account', email: 'a@b.pt', role: 'staff' })).body.error, 'invalid_club');
  const r = await call(f.client, { action: 'create_account', email: 'a@b.pt', club_id: 'nope', role: 'staff' });
  assertEquals([r.status, r.body.error], [404, 'no_club']);
  assertEquals(f.db.accounts.length, 1);
});

Deno.test('only the admin, signed in, can call it', async () => {
  const f = base();
  f.db.accounts.push({ user_id: OTHER, email: 'old@example.com', is_admin: false });
  const body = { action: 'create_account', email: 'a@b.pt', club_id: 'c1', role: 'staff' };
  assertEquals((await call(f.client, body, 'other-token')).status, 403);
  assertEquals((await call(f.client, body, 'forged')).status, 401);
  assertEquals(f.db.accounts.length, 2);
});

Deno.test('delete_account: removes another account, not your own or an admin', async () => {
  const f = base();
  f.db.accounts.push({ user_id: OTHER, email: 'old@example.com', is_admin: false });
  f.db.club_members.push({ club_id: 'c1', user_id: OTHER, role: 'staff' });
  assertEquals((await call(f.client, { action: 'delete_account', user_id: ADMIN })).body.error, 'self');
  assertEquals((await call(f.client, { action: 'delete_account', user_id: OTHER })).status, 200);
  assertEquals(f.db.accounts.length, 1);
  assertEquals(f.db.club_members.length, 0);
});
