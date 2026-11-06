import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame, createTeam, playGame } from './helpers';

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

test('restoring a backup leaves out a game with impossible data', async ({ page }, testInfo) => {
  await createTeam(page, 4);
  await createGame(page);
  await playGame(page);
  const backup = await page.evaluate((key) => {
    const db = JSON.parse(localStorage.getItem(key)!);
    const bad = structuredClone(db.games[0]);
    bad.id = 'evil';
    bad.events.push({ id: 'x', type: 'goal', playerId: 'nobody', t: 1, wall: 1 });
    db.games.push(bad);
    return JSON.stringify(db);
  }, STORE);
  const file = testInfo.outputPath('backup.json');
  await writeFile(file, backup);

  await page.goto('#/profile');
  await page.locator('[data-action="profile-section"]').nth(2).click();
  await page.locator('input[type=file]').setInputFiles(file);
  await page.locator('.dialog-box button[data-v="1"]').click();
  await expect(page.locator('#toast')).toContainText('Backup restored · 1 record left out');
  const ids = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).games.map((g: { id: string }) => g.id),
    STORE,
  );
  expect(ids).not.toContain('evil');
  expect(ids).toHaveLength(1);
  expect(JSON.parse(await readFile(file, 'utf8')).games).toHaveLength(2); // the file itself is untouched
});
