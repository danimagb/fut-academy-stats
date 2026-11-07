import { expect, test } from './fixtures';
import { watchErrors } from './helpers';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test('where the browser can install the app, the hint opens its install dialog', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('#/games');
  const main = page.locator('#main');
  await expect(main.getByRole('button', { name: '+ New game' })).toBeVisible();
  await expect(main.getByRole('region', { name: 'Install the app' })).toHaveCount(0);

  // Chrome fires this when the app can be installed; here the user then says "not now" to it.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(e, {
      prompt: () => {
        (window as Window & { prompted?: boolean }).prompted = true;
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(e);
  });
  const hint = main.getByRole('region', { name: 'Install the app' });
  await expect(hint).toContainText('For a better experience');
  await hint.getByRole('button', { name: 'Install' }).click();
  await expect(hint).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { prompted?: boolean }).prompted)).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('on an iPhone', () => {
  test.use({ userAgent: IPHONE_UA });

  test('the hint says how to add it from the Share menu, and comes back days after it is closed', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await page.goto('#/games');
    const hint = page.getByRole('region', { name: 'Install the app' });
    await expect(hint).toContainText('Add to Home Screen');
    await expect(hint.getByRole('button', { name: 'Install' })).toHaveCount(0);

    await hint.getByRole('button', { name: 'Not now' }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: '+ New game' })).toBeVisible();
    await expect(hint).toHaveCount(0);

    // Closed 8 days ago: it shows again.
    await page.evaluate(() =>
      localStorage.setItem('fut-academy-stats.installHintClosed', String(Date.now() - 8 * 86400000)),
    );
    await page.reload();
    await expect(hint).toBeVisible();
    expect(errors).toEqual([]);
  });
});
