import { expect, test } from '@playwright/test';
import { createGame, createTeam, playGame, watchErrors } from './helpers';

test('a finished game opens on the game screen; its report preview fits and opens full screen', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await createTeam(page, 6);
  await createGame(page);
  await playGame(page);

  // From the games list, a finished game opens the game screen, not the report.
  await page.goto('#/games');
  await page.locator('#main a.card.game').first().click();
  await expect(page).toHaveURL(/#\/game\//);
  await page
    .getByRole('link', { name: /report/i })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/report\//);

  // The preview is a thumbnail as wide as the screen: nothing to scroll sideways.
  const thumb = page.locator('.pdf-thumb');
  await expect(thumb).toBeVisible();
  const box = await thumb.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  // Tapping it shows it full screen; ✕ closes it.
  await thumb.click();
  const zoom = page.getByRole('dialog', { name: 'PDF preview' });
  await expect(zoom).toBeVisible();
  await expect(zoom).toContainText('Stats sheet');
  await zoom.getByRole('button', { name: 'Close' }).click();
  await expect(zoom).toHaveCount(0);

  // Escape closes it too.
  await thumb.click();
  await expect(zoom).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(zoom).toHaveCount(0);
  expect(errors).toEqual([]);
});
