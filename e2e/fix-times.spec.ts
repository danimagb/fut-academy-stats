import { expect, test } from './fixtures';
import { createGame, createTeam, watchErrors } from './helpers';

test('⏱ Fix times ends a half that the coach forgot to end', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page);
  await createGame(page);
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('[data-action="fix-open"]').first().click();
  const sheet = page.locator('#sheet-body');
  await expect(sheet).toContainText('1st half: when did it really end?');
  await sheet.locator('[data-action="fix-apply"]').click();
  await expect(page.locator('#main')).toContainText('Break after 1st half');
  expect(errors).toEqual([]);
});
