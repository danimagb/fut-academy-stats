import { expect, type Page } from '@playwright/test';

/** Fails the test on any uncaught error or console error (except expected network 4xx). */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
      errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/**
 * Creates "Test FC - <ageGroup>" (a team of the signed-in coordinator's club, see fixtures.ts)
 * with players 1..n (shirt names P1..Pn) and stays on the team screen.
 */
export async function createTeam(page: Page, n = 6, ageGroup = 'U8'): Promise<void> {
  await page.goto('#/teams');
  await page.waitForLoadState('networkidle'); // the first sync (account, clubs) has run
  await page.getByRole('button', { name: '+ New team' }).click();
  await page.getByPlaceholder('e.g. U7 B').fill(ageGroup);
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: '＋ Add' }).first().click();
  const sheet = page.locator('#sheet-body');
  for (let i = 1; i <= n; i++) {
    await sheet.locator('input[name="number"]').fill(String(i));
    await sheet.locator('input[name="name"]').fill(`P${i}`);
    await sheet.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(sheet).toContainText(`P${i} added`);
  }
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('#main')).toContainText(`${n} players`);
}

/** New game against "Rival": default format (1 GK + 3), P1 in goal, P1–P4 starting. Ends on the game screen. */
export async function createGame(page: Page): Promise<void> {
  await page.goto('#/new');
  await page.getByPlaceholder('e.g. Sporting U8').fill('Rival');
  const start = page.locator('#main button', { hasText: /^Start$/ });
  for (let i = 0; i < 4; i++) await start.nth(i).click();
  await page.locator('#main button', { hasText: '🧤' }).first().click();
  await page.getByRole('button', { name: 'Create game' }).click();
  await expect(page).toHaveURL(/#\/game\//);
}

/** Clicks the first element with this data-action (pitch tokens and icon buttons have no text name). */
export const action = (page: Page, name: string) => page.locator(`[data-action="${name}"]`).first();

/** Confirms the open confirm dialog. */
export const confirmDialog = (page: Page) => page.locator('.dialog-box button[data-v="1"]').click();

/** Plays the created game through: kick-off, a goal by P1, half time, 2nd half, full time. Ends on the report. */
export async function playGame(page: Page): Promise<void> {
  await page.getByRole('button', { name: '▶ Kick off' }).click();
  await action(page, 'player').click();
  await page.locator('#sheet-body [data-action="goal"]').click();
  await page.getByRole('button', { name: 'End 1st half' }).click();
  await page.getByRole('button', { name: '▶ Start 2nd half' }).click();
  await page.getByRole('button', { name: '🏁 Full time' }).click();
  await confirmDialog(page);
  await expect(page).toHaveURL(/#\/report\//);
}
