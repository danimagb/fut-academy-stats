import { expect, test } from '@playwright/test';
import { createGame, createTeam, watchErrors } from './helpers';

test('the games list filters by team when there is more than one', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 4, 'U8');
  await createGame(page);
  await createTeam(page, 4, 'U9');

  await page.goto('#/games');
  const main = page.locator('#main');
  const pick = main.locator('select[data-pick="games-team"]');
  await expect(main).toContainText('Test FC - U8 x Rival');
  await expect(pick.locator('option')).toHaveText(['All teams', 'Test FC - U8', 'Test FC - U9']);
  await pick.selectOption({ label: 'Test FC - U9' });
  await expect(main).not.toContainText('Rival');
  await page.reload();
  await expect(pick).toHaveValue(/.+/);
  await expect(pick.locator('option:checked')).toHaveText('Test FC - U9');
  await pick.selectOption({ label: 'Test FC - U8' });
  await expect(main).toContainText('Test FC - U8 x Rival');
  await pick.selectOption({ label: 'All teams' });
  await expect(main).toContainText('Test FC - U8 x Rival');
  expect(errors).toEqual([]);
});
