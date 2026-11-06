import { expect, test } from './fixtures';
import { createTeam } from './helpers';

test('after one visit, the app opens with no network', async ({ page, context }) => {
  await createTeam(page, 2);
  // Wait until the service worker controls the page (it precaches the whole app).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await page.goto('#/teams');
  // Signed in (the session is kept on the phone): past the welcome screen, with the team.
  await expect(page.locator('h2.team-group')).toContainText('Test FC');
  await expect(page.locator('#main .card')).toContainText('U8');
});
