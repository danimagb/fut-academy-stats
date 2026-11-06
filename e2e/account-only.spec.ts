import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

const STAFF = { id: '00000000-0000-0000-0000-0000000000d5', email: 'staff@example.com' };

test("staff with no team yet are told so, and can't create teams", async ({ page }) => {
  const errors = watchErrors(page);
  await signInAs(
    page,
    STAFF,
    { is_admin: false },
    {
      clubs: [{ id: 'c1', name: 'Padroense FC', short_name: '' }],
      club_members: [{ club_id: 'c1', user_id: STAFF.id, role: 'staff' }],
    },
  );
  await page.goto('#/teams');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#main')).toContainText(
    "You're not in a team yet. The club's coordinator adds you.",
  );
  await expect(page.getByRole('button', { name: '+ New team' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a team left on the phone from before (not in the cloud) leaves it on the next sync', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(
      'fut-academy-stats.v1',
      JSON.stringify({
        teams: [{ id: 'old', club: 'Old FC', name: 'U9', updatedAt: 1, dirty: false }],
        players: [],
        games: [],
      }),
    );
  });
  await signInAs(page, STAFF, { is_admin: false });
  await page.goto('#/teams');
  await expect(page.locator('#main')).not.toContainText('Old FC', { timeout: 10000 });
});
