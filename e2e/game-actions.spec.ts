import { expect, test } from './fixtures';
import { action, confirmDialog, createGame, createTeam, watchErrors } from './helpers';

test('cards, formation, removing a goal, game details and deleting the game', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 6);
  await createGame(page);
  const main = page.locator('#main');
  const sheet = page.locator('#sheet-body');
  await page.getByRole('button', { name: '▶ Kick off' }).click();

  // A yellow card, then a red card: the player leaves the pitch (3 of 4 left).
  await page.locator('[data-action="player"]').nth(1).click();
  await sheet.locator('[data-action="yellow"]').click();
  await expect(page.locator('#toast')).toContainText('P2');
  await page.locator('[data-action="player"]').nth(2).click();
  await sheet.locator('[data-action="red"]').click();
  await expect(main).toContainText('3/4');

  // Another formation for 3 outfield players.
  await action(page, 'formation').click();
  await sheet.locator('[data-action="set-formation"]:not(.current)').first().click();
  await expect(action(page, 'formation')).not.toHaveText('2-1 ▾');

  // A goal, then remove it from the timeline.
  await action(page, 'player').click();
  await sheet.locator('[data-action="goal"]').click();
  await expect(main).toContainText('1 – 0');
  await action(page, 'edit-goal').click();
  await sheet.locator('[data-action="delete-goal"]').click();
  await confirmDialog(page);
  await expect(main).toContainText('0 – 0');

  // Change the opponent in the game details.
  await page.getByRole('button', { name: 'Menu' }).click();
  await action(page, 'edit-info').click();
  await sheet.locator('input[name="opponent"]').fill('New Rival');
  await sheet.locator('form[data-form="game-info"] button.primary').click();
  await expect(main).toContainText('Test FC - U8 x New Rival');

  // Delete the game.
  await page.getByRole('button', { name: 'Menu' }).click();
  await action(page, 'delete-game').click();
  await confirmDialog(page);
  await page.goto('#/games');
  await expect(main).not.toContainText('New Rival');
  expect(errors).toEqual([]);
});
