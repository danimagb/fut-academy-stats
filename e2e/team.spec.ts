import { expect, test } from './fixtures';
import { confirmDialog, createTeam, watchErrors } from './helpers';

test('players can be edited and removed, and the team deleted', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 3);
  const main = page.locator('#main');

  // Edit P2's shirt name.
  await page.locator('[data-action="edit-player"]').nth(1).click();
  const sheet = page.locator('#sheet-body');
  await sheet.locator('input[name="name"]').fill('Renamed');
  await sheet.locator('button.primary, button[type="submit"]').first().click();
  await expect(main).toContainText('Renamed');

  // Remove P3.
  await page.locator('[data-action="delete-player"]').nth(2).click();
  await confirmDialog(page);
  await expect(main).toContainText('2 players');
  await expect(main).not.toContainText('P3');

  // A team with players can't be deleted.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('[data-action="delete-team"]').click();
  await expect(page.locator('.dialog-box')).toContainText('players');
  await confirmDialog(page);

  // Without players it can.
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-action="delete-player"]').first().click();
    await confirmDialog(page);
  }
  await expect(main).toContainText('0 players');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('[data-action="delete-team"]').click();
  await confirmDialog(page);
  await page.goto('#/teams');
  await expect(main).not.toContainText('Test FC - U8');
  expect(errors).toEqual([]);
});
