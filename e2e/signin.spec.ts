import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

test('sign-in shows the error from the server (Supabase is stubbed: CI never calls the real project)', async ({
  page,
}) => {
  const errors = watchErrors(page);
  const calls: string[] = [];
  await page.route('https://*.supabase.co/**', (route) => {
    calls.push(new URL(route.request().url()).pathname);
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invalid_credentials',
        error_code: 'invalid_credentials',
        msg: 'Invalid login credentials',
      }),
    });
  });
  await page.goto('#/profile');
  await page.locator('input[type=email]').fill('nobody@example.com');
  await page.locator('input[type=password]').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.locator('#main')).toContainText('Wrong email or password.');
  expect(calls).toContain('/auth/v1/token');
  expect(errors).toEqual([]);
});
