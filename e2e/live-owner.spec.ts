import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { confirmDialog, watchErrors } from './helpers';

// A live game is logged by one phone: elsewhere it's read-only, and a director can take it over.
const ME = { id: '00000000-0000-0000-0000-0000000000e1', email: 'coord@example.com' };
const ROW = { deleted_at: null, updated_at: '2026-11-01T10:00:00Z' };
const P = ['p1', 'p2', 'p3', 'p4', 'p5'];
const game = (extra: Record<string, unknown>) => ({
  id: 'g1',
  teamId: 't1',
  club: 'Padroense FC',
  team: 'Sub-7B',
  opponent: 'Rival FC',
  home: true,
  round: '',
  date: '2026-11-07',
  time: '10:00',
  formatId: 'U7',
  field: 3,
  periods: 2,
  periodMin: 20,
  maxExtra: 10,
  squad: P,
  starters: P.slice(0, 4),
  gkId: 'p1',
  lineup: P.slice(0, 4),
  formation: '2-1',
  alerted: {},
  autoStopped: null,
  names: Object.fromEntries(P.map((p, i) => [p, { name: `P${i + 1}`, number: String(i + 1), fullName: '' }])),
  clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 },
  marks: [],
  events: [],
  ...extra,
});
const cloud = (g: Record<string, unknown>) => ({
  accounts: [{ user_id: ME.id, email: ME.email, is_admin: false }],
  clubs: [{ id: 'c1', name: 'Padroense FC', short_name: 'PFC' }],
  club_members: [{ club_id: 'c1', user_id: ME.id, role: 'manager' }],
  teams: [{ id: 't1', club_id: 'c1', club: 'Padroense FC', name: 'Sub-7B', ...ROW }],
  team_members: [],
  players: P.map((p, i) => ({
    id: p,
    team_id: 't1',
    number: String(i + 1),
    name: `P${i + 1}`,
    full_name: '',
    ...ROW,
  })),
  games: [{ id: 'g1', team_id: 't1', status: g.status, data: g, ...ROW }],
});
type Owner = { userId?: string; deviceId?: string; from?: string } | undefined;
const ownerOf = (rows: Record<string, Record<string, unknown>[]>): Owner =>
  (rows.games?.[0]?.data as { owner?: Owner } | undefined)?.owner;

test('kicking off makes this phone the owner of the live game', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ME, { is_admin: false }, cloud(game({ status: 'scheduled' })));
  await page.goto('#/game/g1');
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await expect.poll(() => ownerOf(rows)?.userId, { timeout: 10000 }).toBe(ME.id);
  expect(ownerOf(rows)?.from).toBeUndefined();
  expect(errors).toEqual([]);
});

test('a game logged on another phone is read-only here, until a director takes it over', async ({ page }) => {
  const errors = watchErrors(page);
  const owner = { userId: 'u-other', email: 'joao@example.com', deviceId: 'joaos-phone', at: 1 };
  const live = game({
    status: 'live',
    owner,
    clock: { running: true, startedAt: Date.now() - 60000, elapsedMs: 0, period: 1 },
    marks: [{ type: 'start', period: 1, t: 0, wall: Date.now() - 60000 }],
  });
  const rows = await signInAs(page, ME, { is_admin: false }, cloud(live));
  await page.goto('#/game/g1');
  await expect(page.locator('#main .hint.warn')).toContainText(
    'joao@example.com is logging this game on another phone',
  );
  await expect(page.getByRole('button', { name: '+ Goal conceded' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Continue on this phone/ }).click();
  await confirmDialog(page);
  await expect(page.locator('#main .hint.warn')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Goal conceded' })).toBeVisible();
  await expect.poll(() => ownerOf(rows)?.userId, { timeout: 10000 }).toBe(ME.id);
  expect(ownerOf(rows)?.from).toBe('joaos-phone');
  expect(errors).toEqual([]);
});
