import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

// A coordinator's cloud team with a game ready to start. Offline: the game runs, the team doesn't change.
const ME = { id: '00000000-0000-0000-0000-0000000000e1', email: 'coord@example.com' };
const ROW = { deleted_at: null, updated_at: '2026-11-01T10:00:00Z' };
const P = ['p1', 'p2', 'p3', 'p4', 'p5'];
const game = {
  id: 'g1',
  teamId: 't1',
  club: 'Padroense FC',
  team: 'Sub-7B',
  opponent: 'Rival FC',
  home: true,
  round: '',
  date: '2026-11-07',
  time: '10:00',
  status: 'scheduled',
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
};

test('offline, a game can be started and logged, but the team and new games need the internet', async ({
  page,
  context,
}) => {
  const errors = watchErrors(page);
  const rows = await signInAs(
    page,
    ME,
    { is_admin: false },
    {
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
      games: [{ id: 'g1', team_id: 't1', data: game, ...ROW }],
    },
  );
  await page.goto('#/team/t1');
  await expect(page.locator('form.team-name')).toBeVisible(); // online: the name can be changed
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  await expect(page.locator('form.team-name')).toHaveCount(0); // offline: read-only
  await page.locator('[data-action="add-player"]').click();
  await expect(page.locator('#toast')).toContainText('Needs internet');
  await expect(page.locator('#sheet')).toBeHidden();

  // Creating a game: refused offline, straight from the New game button.
  await page.goto('#/games');
  await page.getByRole('button', { name: '+ New game' }).click();
  await expect(page.locator('#toast')).toContainText('Needs internet');
  await expect(page).toHaveURL(/#\/games/);
  // (Opened anyway, e.g. by its address: a warning, and saving is refused.)
  await page.goto('#/new');
  await expect(page.locator('#main .hint.warn')).toContainText('Needs internet');
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.locator('#toast')).toContainText('Needs internet');
  await expect(page).toHaveURL(/#\/new/);

  // Running the game: works offline.
  await page.goto('#/game/g1');
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await page.getByRole('button', { name: '+ Goal conceded' }).click();
  await expect(page.locator('.scoreboard')).toContainText('0 – 1');

  // Back online: the game reaches the cloud.
  await context.setOffline(false);
  await expect
    .poll(() => (rows.games?.[0]?.data as { status?: string } | undefined)?.status, { timeout: 15000 })
    .toBe('live');
  expect(errors.filter((e) => !/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([]);
});
