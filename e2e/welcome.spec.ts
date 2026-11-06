import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

test('without a session every screen is the welcome screen, with sign-in and no tab bar', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.route('https://*.supabase.co/**', (r) => r.fulfill({ status: 404, json: {} }));
  for (const at of ['#/games', '#/teams', '#/stats', '#/profile']) {
    await page.goto(at);
    await expect(page.locator('.welcome')).toContainText('Fut Academy Stats');
    await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('#tabbar')).toBeHidden();
  }
  await page.getByRole('tab', { name: 'Activate account' }).click();
  await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('signed in without access: says so, and offers to sign out', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, {
    id: '00000000-0000-0000-0000-0000000000f1',
    email: 'nobody@example.com',
  });
  rows.accounts = []; // no accounts row: the admin gave this email no access
  await page.goto('#/games');
  await expect(page.locator('.welcome')).toContainText('no access');
  await expect(page.locator('#tabbar')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('signed in with access: the app, with the tab bar', async ({ page }) => {
  await signInAs(page);
  await page.goto('#/games');
  await expect(page.locator('.welcome')).toHaveCount(0);
  await expect(page.locator('#tabbar')).toBeVisible();
});
