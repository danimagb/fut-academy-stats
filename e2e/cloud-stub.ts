import type { Page, Request } from '@playwright/test';

// A signed-in user without a real Supabase project: a stored session (read by supabase-js on
// start-up) and an in-memory stand-in for the REST tables, the auth calls and the `admin`
// Edge Function. Tests never reach the real project. There is no RLS here: tests check screens.

export const ADMIN = { id: '00000000-0000-0000-0000-0000000000ad', email: 'admin@example.com' };

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
/** Answers a call to the `admin` Edge Function: [HTTP status, JSON body]. */
type AdminFunction = (body: Row, rows: Tables) => [number, unknown];

/** The row filters supabase-js puts in the query string: eq., in.(…), is.null. */
function matches(row: Row, url: URL): boolean {
  for (const [col, cond] of url.searchParams) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(col)) continue;
    const v = row[col];
    if (cond.startsWith('eq.') && String(v) !== cond.slice(3)) return false;
    if (cond.startsWith('in.(')) {
      const list = cond
        .slice(4, -1)
        .split(',')
        .map((x) => x.replace(/^"|"$/g, ''));
      if (!list.includes(String(v))) return false;
    }
    if (cond === 'is.null' && v != null) return false;
  }
  return true;
}

/** A default `admin` function: creates the account (if new) and the club role. */
export const fakeAdminFunction: AdminFunction = (body, rows) => {
  if (body.action !== 'create_account') return [400, { error: 'unknown_action', message: 'Unknown action' }];
  const email = String(body.email).toLowerCase();
  let account = (rows.accounts ??= []).find((a) => a.email === email);
  const existed = !!account;
  if (!account) {
    account = { user_id: crypto.randomUUID(), email, is_admin: false };
    rows.accounts.push(account);
  }
  (rows.club_members ??= []).push({ club_id: body.club_id, user_id: account.user_id, role: body.role });
  return [200, { ok: true, user_id: account.user_id, existed }];
};

export async function signInAs(
  page: Page,
  user = ADMIN,
  account: Row = { is_admin: true },
  tables: Tables = {},
  adminFunction: AdminFunction = fakeAdminFunction,
) {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated' },
  };
  await page.addInitScript((s) => localStorage.setItem('fut-academy-stats.auth', s), JSON.stringify(session));
  const rows: Tables = {
    accounts: [{ user_id: user.id, email: user.email, ...account }],
    clubs: [],
    club_members: [],
    teams: [],
    players: [],
    games: [],
    team_members: [],
    ...tables,
  };
  const body = (req: Request): unknown => {
    try {
      return req.postDataJSON();
    } catch {
      return null;
    }
  };
  await page.route('https://*.supabase.co/**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith('/auth/v1/user')) return route.fulfill({ json: session.user });
    if (url.pathname.startsWith('/auth/v1/token')) return route.fulfill({ json: session });
    if (url.pathname === '/functions/v1/admin') {
      const [status, json] = adminFunction((body(req) ?? {}) as Row, rows);
      return route.fulfill({ status, json });
    }
    // my_teams(): the user's teams and roles, worked out from the tables like the database does.
    if (url.pathname === '/rest/v1/rpc/my_teams') {
      const managed = new Set(
        (rows.club_members ?? [])
          .filter((m) => m.user_id === user.id && m.role === 'manager')
          .map((m) => m.club_id),
      );
      const mine = (rows.teams ?? [])
        .filter((tm) => managed.has(tm.club_id))
        .map((tm) => ({ team_id: tm.id, role: 'club_manager' }));
      for (const m of rows.team_members ?? [])
        if (m.user_id === user.id && !mine.some((x) => x.team_id === m.team_id))
          mine.push({ team_id: m.team_id, role: m.role === 'manager' ? 'team_manager' : 'team_coach' });
      return route.fulfill({ json: mine });
    }
    const table = url.pathname.match(/^\/rest\/v1\/(\w+)/)?.[1];
    if (!table) return route.fulfill({ status: 404, json: {} });
    const list = (rows[table] ??= []);
    const method = req.method();
    let result: Row[];
    if (method === 'POST') {
      const input = body(req);
      result = (Array.isArray(input) ? input : [input]) as Row[];
      for (const r of result) {
        if (table === 'clubs' && !r.id) r.id = crypto.randomUUID();
        list.push(r);
      }
    } else if (method === 'PATCH') {
      result = list.filter((r) => matches(r, url));
      for (const r of result) Object.assign(r, body(req));
    } else if (method === 'DELETE') {
      result = list.filter((r) => matches(r, url));
      rows[table] = list.filter((r) => !result.includes(r));
    } else {
      result = list.filter((r) => matches(r, url));
    }
    // maybeSingle() / single() ask for one object; writes without .select() want no body.
    const one = (req.headers().accept ?? '').includes('vnd.pgrst.object');
    const wantsRows = method === 'GET' || (req.headers().prefer ?? '').includes('return=representation');
    if (!wantsRows) return route.fulfill({ status: method === 'POST' ? 201 : 204, body: '' });
    return route.fulfill({
      json: one ? (result[0] ?? null) : result,
      headers: { 'content-range': `0-${result.length}/*` },
    });
  });
  return rows;
}
