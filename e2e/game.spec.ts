import { expect, test } from '@playwright/test';
import { action, confirmDialog, createGame, createTeam, watchErrors } from './helpers';

test('a whole game: team, game, goals, half time, full time, report and PDF', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page);

  // The default format is 1 GK + 3: five starters are refused.
  await page.goto('#/new');
  await page.getByPlaceholder('e.g. Sporting U8').fill('Rival');
  const start = page.locator('#main button', { hasText: /^Start$/ });
  for (let i = 0; i < 5; i++) await start.nth(i).click();
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page.locator('.dialog-box')).toContainText('Pick exactly 4 starters (1 GK + 3). You have 5.');
  await confirmDialog(page);
  // Move the 5th back to the bench, put P1 in goal, and the game is created.
  await page
    .locator('#main button', { hasText: /^Bench$/ })
    .nth(4)
    .click();
  await page.locator('#main button', { hasText: '🧤' }).first().click();
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/#\/game\//);
  const main = page.locator('#main');
  await expect(main).toContainText('Not started');

  await page.clock.install();
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await expect(main).toContainText('1st half');

  // A goal from the player sheet, a goal conceded, and undo of the goal conceded.
  await action(page, 'player').click();
  await page.locator('#sheet-body [data-action="goal"]').click();
  await page.getByRole('button', { name: '+ Goal conceded' }).click();
  await expect(main).toContainText('1 – 1');
  await page.locator('[data-action="undo"]').first().click();
  await expect(main).toContainText('1 – 0');
  await page.getByRole('button', { name: '+ Goal conceded' }).click();

  // A substitution from the sheet: P2 off, P5 on.
  await page.locator('[data-action="player"]').nth(1).click();
  await page.locator('#sheet-body [data-action="do-sub"]').first().click();
  await expect(page.locator('#toast')).toContainText('P5');

  // Half time, then the 2nd half starts at 20:00 whatever the 1st half's length.
  await page.clock.runFor(3 * 60_000);
  await page.getByRole('button', { name: 'End 1st half' }).click();
  await expect(main).toContainText('Break after 1st half');
  await page.getByRole('button', { name: '▶ Start 2nd half' }).click();
  await expect(main).toContainText('2nd half');
  await expect(main).toContainText('20:00');

  // Full time asks first, then opens the report.
  await page.getByRole('button', { name: '🏁 Full time' }).click();
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/report\//);
  await expect(main).toContainText('1 – 1');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '📄 Share PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/^TestFC_U8_.*_Stats\.pdf$/);

  expect(errors).toEqual([]);
});

test('"To goal" makes a pitch player the goalkeeper', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page);
  await createGame(page);
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await page.locator('[data-action="player"]').nth(1).click();
  await page.locator('#sheet-body [data-action="make-gk"]').click();
  await expect(page.locator('#main')).toContainText('In goal: #2 P2');
  expect(errors).toEqual([]);
});
