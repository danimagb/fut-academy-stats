import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { watchErrors } from './helpers';

// The app opened from the home screen has no browser gesture: pulling down syncs and redraws.
const SHOTS = process.env.PTR_SHOTS;

const at = (y: number) => [{ x: 200, y }];

async function pull(page: Page, dy: number, { release = true } = {}): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(150) });
  for (let y = 150; y <= 150 + dy; y += 20)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(y) });
  if (release) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test.describe('opened from the home screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  });

  test('pulling down from the top syncs now', async ({ page }) => {
    const errors = watchErrors(page);
    let pulls = 0;
    await page.route('https://*.supabase.co/rest/v1/**', (route) => {
      if (route.request().method() === 'GET') pulls++;
      return route.fallback();
    });
    await page.goto('#/games');
    await expect(page.getByRole('button', { name: '+ New game' })).toBeVisible();
    await expect.poll(() => pulls).toBeGreaterThan(0); // the sync at start
    const before = pulls;

    await pull(page, 40); // not far enough
    await expect(page.locator('.ptr')).toBeHidden();
    await pull(page, 200);
    await expect.poll(() => pulls).toBeGreaterThan(before);
    await expect(page.locator('.ptr')).toBeHidden();
    expect(errors).toEqual([]);
  });

  for (const theme of ['light', 'dark'])
    test(`the indicator while pulling (${theme})`, async ({ page }) => {
      test.skip(!SHOTS, 'screenshots only on demand');
      await page.addInitScript((th) => localStorage.setItem('fut-academy-stats.theme', th), theme);
      await page.goto('#/games');
      await expect(page.getByRole('button', { name: '+ New game' })).toBeVisible();
      await pull(page, 200, { release: false });
      await page.screenshot({
        path: `${SHOTS}/ptr-${theme}.png`,
        clip: { x: 0, y: 0, width: 390, height: 260 },
      });
    });
});

test("in the browser, the browser's own gesture is left alone", async ({ page }) => {
  await page.goto('#/games');
  await expect(page.getByRole('button', { name: '+ New game' })).toBeVisible();
  await expect(page.locator('.ptr')).toHaveCount(0);
});
