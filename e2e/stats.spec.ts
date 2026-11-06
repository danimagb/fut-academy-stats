import { expect, test } from './fixtures';
import { createGame, createTeam, playGame, watchErrors } from './helpers';

test("stats add up finished games, and a player's sheet opens", async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page);
  await createGame(page);
  await playGame(page);

  await page.goto('#/stats');
  const main = page.locator('#main');
  await expect(main).toContainText('1 game');
  await expect(main).toContainText('1W 0D 0L');
  await expect(main).toContainText('Goals 1–0');

  await main.getByText('P1', { exact: true }).first().click();
  await expect(page).toHaveURL(/#\/player\//);
  await expect(main).toContainText('P1');

  const download = page.waitForEvent('download');
  await page.locator('[data-action="player-pdf"]').click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  expect(errors).toEqual([]);
});
