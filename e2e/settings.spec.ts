import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

test.describe('language', () => {
  test.use({ locale: 'pt-PT' });

  test('a Portuguese phone opens in Portuguese, and the choice is kept', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('#/profile');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Perfil');

    await page.locator('[data-action="profile-section"]').nth(1).click();
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(errors).toEqual([]);
  });
});

test('light and dark themes', async ({ page }) => {
  await page.goto('#/profile');
  await page.locator('[data-action="profile-section"]').nth(1).click();
  await page.locator('[data-action="theme"][data-v="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-action="theme"][data-v="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
