import { expect, test } from '@playwright/test';
import { createGame, createTeam, watchErrors } from './helpers';

test('the games list filters by team when there is more than one', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 4, 'U8');
  await createGame(page);
  await createTeam(page, 4, 'U9');

  await page.goto('#/games');
  const main = page.locator('#main');
  await expect(main).toContainText('Test FC - U8 x Rival');
  await main.getByRole('tab', { name: 'Test FC - U9' }).click();
  await expect(main).not.toContainText('Rival');
  await page.reload();
  await expect(main.getByRole('tab', { name: 'Test FC - U9' })).toHaveAttribute('aria-selected', 'true');
  await main.getByRole('tab', { name: 'Test FC - U8' }).click();
  await expect(main).toContainText('Test FC - U8 x Rival');
  expect(errors).toEqual([]);
});
