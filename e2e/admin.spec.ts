import { expect, test } from '@playwright/test';
import { ADMIN, signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

test('the admin sees the Admin tab and the Admin page lists the accounts', async ({ page }) => {
  const errors = watchErrors(page);
  await signInAs(
    page,
    ADMIN,
    { kind: 'coach', is_admin: true },
    {
      accounts: [
        { user_id: ADMIN.id, email: ADMIN.email, kind: 'coach', is_admin: true },
        {
          user_id: '00000000-0000-0000-0000-0000000000c1',
          email: 'coach1@example.com',
          kind: 'coach',
          is_admin: false,
        },
      ],
    },
  );
  await page.goto('#/profile');
  await expect(page.locator('#main')).toContainText(ADMIN.email);
  const adminTab = page.locator('#tabbar a[href="#/admin"]');
  await expect(adminTab).toBeVisible();
  await adminTab.click();
  await expect(page).toHaveURL(/#\/admin/);
  await expect(page.locator('#main')).toContainText('coach1@example.com');
  expect(errors).toEqual([]);
});
