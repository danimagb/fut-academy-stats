import { expect, test } from './fixtures';
import { action, createGame, createTeam, playGame, watchErrors } from './helpers';

test('a finished game records nothing new, but its goals can still be edited', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 6);
  await createGame(page);
  await playGame(page);

  // Back to the game screen: a tap on a player shows who it is, with no actions.
  await page.goto(page.url().replace('#/report/', '#/game/'));
  const sheet = page.locator('#sheet-body');
  await action(page, 'player').click();
  await expect(sheet).toContainText('Game finished: no new events can be recorded.');
  await expect(sheet.locator('[data-action="goal"]')).toHaveCount(0);
  await sheet.locator('[data-action="close-sheet"]').click();

  // The goal in the timeline can still be edited.
  await action(page, 'edit-goal').click();
  await expect(sheet.locator('[data-action="delete-goal"]')).toBeVisible();
  expect(errors).toEqual([]);
});
