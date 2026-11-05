import { expect, test } from '@playwright/test';
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
  await expect(page.locator('#main')).toContainText('Test FC - U8');
});
