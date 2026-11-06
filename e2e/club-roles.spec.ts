import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

// A cloud team of Padroense FC, downloaded by the sync with this user's role from my_teams().
const USER = { id: '00000000-0000-0000-0000-0000000000e1', email: 'person@example.com' };
const cloud = (clubRole: string | null, teamRole: string | null) => ({
  clubs: [{ id: 'c1', name: 'Padroense FC', short_name: 'PFC' }],
  club_members: clubRole ? [{ club_id: 'c1', user_id: USER.id, role: clubRole }] : [],
  teams: [
    {
      id: 't1',
      club_id: 'c1',
      club: 'Padroense FC',
      name: 'Sub-7B',
      deleted_at: null,
      updated_at: '2026-11-01T10:00:00Z',
    },
  ],
  team_members: teamRole ? [{ team_id: 't1', user_id: USER.id, role: teamRole }] : [],
  players: [
    {
      id: 'p1',
      team_id: 't1',
      number: '7',
      name: 'Rui',
      full_name: '',
      deleted_at: null,
      updated_at: '2026-11-01T10:00:00Z',
    },
  ],
});

for (const [who, clubRole, teamRole, readOnly] of [
  ['a team coach', 'staff', 'coach', true],
  ['a team manager', 'staff', 'manager', false],
  ['a club manager', 'manager', null, false],
] as const) {
  test(`${who} gets the club's team, ${readOnly ? 'read-only' : 'with players to edit'}`, async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await signInAs(page, USER, { is_admin: false }, cloud(clubRole, teamRole));
    await page.goto('#/teams');
    await expect(page.locator('h2.team-group')).toContainText('Padroense FC');
    await expect(page.locator('#main .card')).toContainText('Sub-7B');
    await page.goto('#/team/t1');
    await expect(page.locator('#main')).toContainText('Rui');
    if (readOnly) {
      await expect(page.locator('#main .badge.ro')).toBeVisible();
      await expect(page.locator('[data-action="edit-player"]')).toHaveCount(0);
    } else {
      await expect(page.locator('#main .badge.ro')).toHaveCount(0);
      await expect(page.locator('[data-action="edit-player"]')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
}

test('the account on Profile shows the club and the role in it', async ({ page }) => {
  await signInAs(page, USER, { is_admin: false }, cloud('manager', null));
  await page.goto('#/profile');
  await expect(page.locator('#main')).toContainText('Coordinator');
});
