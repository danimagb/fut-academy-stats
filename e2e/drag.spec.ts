import { expect, test } from './fixtures';
import { createGame, createTeam, watchErrors } from './helpers';

// Tall enough to have the pitch and the bench on screen together (the mouse can't drag off-screen).
test.use({ viewport: { width: 390, height: 1200 } });

test('holding a bench player and dropping it on a pitch player substitutes them', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 6);
  // P5 on the bench: tap "Bench" for the 5th player before creating the game.
  await page.goto('#/new');
  await page
    .locator('#main button', { hasText: /^Bench$/ })
    .nth(4)
    .click();
  await createGame(page);
  await page.getByRole('button', { name: '▶ Kick off' }).click();

  const bench = page.locator('.chip:not(.tok)[data-id]', { hasText: 'P5' });
  const pitch = page.locator('.chip.tok', { hasText: 'P3' });
  const from = (await bench.boundingBox())!;
  const to = (await pitch.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600); // hold until the drag starts
  await page.mouse.move(to.x + to.width / 2, to.y + 20, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('#toast')).toContainText('P5');
  await expect(page.locator('.chip.tok', { hasText: 'P5' })).toBeVisible();
  await expect(page.locator('#sheet')).toBeHidden(); // the drop didn't also count as a tap
  expect(errors).toEqual([]);
});
