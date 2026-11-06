import { expect, test } from './fixtures';
import { createGame, createTeam } from './helpers';

const STORE = 'fut-academy-stats.v1';

test('a damaged record on the phone is left out (and kept aside); the app still works', async ({ page }) => {
  await createTeam(page, 4);
  await createGame(page);
  await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key)!);
    db.games.push({ id: 'broken', events: 'not a list' });
    localStorage.setItem(key, JSON.stringify(db));
  }, STORE);
  await page.reload();
  await expect(page.locator('#toast')).toContainText('1 record left out because it looks damaged');
  const aside = await page.evaluate(() => JSON.parse(localStorage.getItem('fut-academy-stats.rejected')!));
  expect(aside.map((r: { record: { id: string } }) => r.record.id)).toEqual(['broken']);
  await page.goto('#/games');
  await expect(page.locator('#main')).toContainText('Rival');
});
