import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

// A small PNG (40 × 30, with a transparent hole): the app crops it to a square.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAYAAABe3VzdAAAAW0lEQVR4nO3XsQ3AIAwAwThiDhgj+3fJGEwCI4DyBS7+ayOdLLkg3lrHlbj7NGCVQFp6YCGPn95jZ+5r7fchpt+gQJpAmkCaQJpAmkCaQJpAmkBa+HGHCaSlB05B6AhDkwtk+QAAAABJRU5ErkJggg==',
  'base64',
);
const ME = { id: '00000000-0000-0000-0000-0000000000e1', email: 'coord@example.com' };
const ROW = { deleted_at: null, updated_at: '2026-11-01T10:00:00Z' };
const club = (role: string, logoVersion: number | null = null) => ({
  accounts: [{ user_id: ME.id, email: ME.email, is_admin: false }],
  clubs: [{ id: 'c1', name: 'Padroense FC', short_name: 'PFC', logo_version: logoVersion }],
  club_members: [{ club_id: 'c1', user_id: ME.id, role }],
  teams: [{ id: 't1', club_id: 'c1', club: 'Padroense FC', name: 'Sub-7B', ...ROW }],
  team_members: role === 'staff' ? [{ team_id: 't1', user_id: ME.id, role: 'coach' }] : [],
  players: [],
  games: [],
});

test('a coordinator adds the club logo, and it shows next to the club', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ME, { is_admin: false }, club('manager'));
  await page.goto('#/club/c1');
  await expect(page.locator('.club-crest-blank')).toBeVisible();
  await page
    .locator('input.club-logo-file')
    .setInputFiles({ name: 'crest.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#toast')).toContainText('Logo saved');
  await expect(page.locator('.club-crest img.club-logo')).toBeVisible();
  expect(rows.clubs?.[0]?.logo_version).toBe(1);
  // The kept logo is a square.
  const size = await page
    .locator('.club-crest img')
    .evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([256, 256]);
  await page.goto('#/teams');
  await expect(page.locator('h2.team-group img.club-logo')).toBeVisible();

  await page.goto('#/club/c1');
  await expect(page.locator('.club-crest-badge')).toHaveText('✎');
  await page.getByRole('button', { name: 'Club details' }).click();
  await page.getByRole('button', { name: 'Remove logo' }).click();
  await page.locator('.dialog').getByRole('button', { name: 'Remove logo' }).click();
  await expect(page.locator('.club-crest-blank')).toBeVisible();
  expect(rows.clubs?.[0]?.logo_version).toBeNull();
  expect(errors).toEqual([]);
});

test("another phone downloads the club's logo once and keeps it", async ({ page }) => {
  const errors = watchErrors(page);
  await signInAs(page, ME, { is_admin: false }, club('staff', 4), undefined, [
    ['c1/logo', { body: PNG, type: 'image/png' }],
  ]);
  const downloads: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/object/public/club-logos/')) downloads.push(r.url());
  });
  await page.goto('#/teams');
  await expect(page.locator('h2.team-group img.club-logo')).toBeVisible();
  expect(downloads).toEqual([expect.stringMatching(/club-logos\/c1\/logo\?v=4$/)]);
  await page.reload();
  await expect(page.locator('h2.team-group img.club-logo')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(downloads).toHaveLength(1);
  expect(errors).toEqual([]);
});
