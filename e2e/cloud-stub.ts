import type { Page } from '@playwright/test';

// A signed-in user without a real Supabase project: a stored session (read by supabase-js on
// start-up) and canned answers for the REST and auth calls the app makes. Tests never reach
// the real project.

export const ADMIN = { id: '00000000-0000-0000-0000-0000000000ad', email: 'admin@example.com' };

type Tables = Record<string, unknown[]>;

export async function signInAs(
  page: Page,
  user = ADMIN,
  account = { kind: 'coach', is_admin: true },
  tables: Tables = {},
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
    teams: [],
    players: [],
    games: [],
    team_members: [],
    ...tables,
  };
  await page.route('https://*.supabase.co/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/auth/v1/user')) return route.fulfill({ json: session.user });
    if (url.pathname.startsWith('/auth/v1/token')) return route.fulfill({ json: session });
    const table = url.pathname.match(/^\/rest\/v1\/(\w+)/)?.[1];
    if (table) {
      // Apply `col=eq.value` filters, the only kind these screens use to pick rows.
      let list = rows[table] ?? [];
      for (const [col, cond] of url.searchParams) {
        if (cond.startsWith('eq.'))
          list = list.filter((r) => String((r as Record<string, unknown>)[col]) === cond.slice(3));
      }
      // maybeSingle() / single() ask for one object
      const one = (route.request().headers().accept ?? '').includes('vnd.pgrst.object');
      return route.fulfill({
        json: one ? (list[0] ?? null) : list,
        headers: { 'content-range': `0-${list.length}/*` },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
}
