import { expect, test } from '@playwright/test';
import { ADMIN, signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

const M = { user_id: '00000000-0000-0000-0000-0000000000b1', email: 'manager@example.com', is_admin: false };
const C = { user_id: '00000000-0000-0000-0000-0000000000c1', email: 'coach1@example.com', is_admin: false };

/** Padroense FC with one team (Sub-7B), M as staff and team manager, C as staff only. */
const padroense = () => ({
  accounts: [{ user_id: ADMIN.id, email: ADMIN.email, is_admin: true }, M, C],
  clubs: [{ id: 'c1', name: 'Padroense FC', short_name: 'PFC' }],
  club_members: [
    { club_id: 'c1', user_id: ADMIN.id, role: 'manager' },
    { club_id: 'c1', user_id: M.user_id, role: 'staff' },
    { club_id: 'c1', user_id: C.user_id, role: 'staff' },
  ],
  teams: [{ id: 't1', club_id: 'c1', club: 'Padroense FC', name: 'Sub-7B', deleted_at: null }],
  team_members: [{ team_id: 't1', user_id: M.user_id, role: 'manager' }],
});

test('the admin sees the Admin tab, clubs with their people and teams, and accounts', async ({ page }) => {
  const errors = watchErrors(page);
  await signInAs(page, ADMIN, { is_admin: true }, padroense());
  await page.goto('#/profile');
  await expect(page.locator('#main')).toContainText(ADMIN.email);
  const adminTab = page.locator('#tabbar a[href="#/admin"]');
  await expect(adminTab).toBeVisible();
  await adminTab.click();
  await expect(page).toHaveURL(/#\/admin/);
  const club = page.locator('.admin-club');
  await expect(club).toContainText('Padroense FC');
  await expect(club).toContainText('(PFC)');
  await expect(club).toContainText('3 people · 1 team');
  await expect(club.locator('.admin-team')).toContainText('Sub-7B');
  await expect(club.locator('.admin-team')).toContainText(M.email);
  await expect(page.locator('.admin-accounts')).toContainText('Padroense FC · Coordinator');
  await expect(page.locator('.admin-accounts')).toContainText('Padroense FC · Staff');
  expect(errors).toEqual([]);
});

test('the admin creates a club and gives a new person access to it as coordinator', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ADMIN, { is_admin: true });
  await page.goto('#/admin');
  await expect(page.locator('#main')).toContainText('Create a club first');
  await page.getByPlaceholder('e.g. Padroense FC').fill('Novo Clube');
  await page.getByPlaceholder('PFC').fill('NC');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.admin-club')).toContainText('Novo Clube');
  expect(rows.clubs).toMatchObject([{ name: 'Novo Clube', short_name: 'NC' }]);

  await page.locator('form[data-form="admin-create"] input[name="email"]').fill('Coord@Example.com');
  await page.locator('form[data-form="admin-create"] select[name="role"]').selectOption('manager');
  await page.getByRole('button', { name: 'Give access' }).click();
  await expect(page.locator('.dialog')).toContainText('coord@example.com can now sign in');
  await page.locator('.dialog').getByRole('button').click();
  await expect(page.locator('.admin-club .members')).toContainText('coord@example.com');
  await expect(page.locator('.admin-club .members select')).toHaveValue('manager');
  expect(rows.club_members).toMatchObject([{ club_id: rows.clubs?.[0]?.id, role: 'manager' }]);
  expect(errors).toEqual([]);
});

test('the admin changes club and team roles and gives club staff a role in a team', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ADMIN, { is_admin: true }, padroense());
  await page.goto('#/admin');
  // The admin manages Padroense FC: let the first sync download its team (and redraw) first.
  await page.waitForLoadState('networkidle');
  const team = page.locator('.admin-team');
  await expect(team).toContainText(M.email);

  // Only the club's people who aren't in the team yet can be picked.
  const pick = team.locator('form[data-form="admin-add-member"] select[name="user"]');
  await expect(pick.locator('option')).toHaveText(['Choose someone from the club…', ADMIN.email, C.email]);
  await pick.selectOption(C.user_id);
  await team.getByRole('button', { name: 'Add' }).click();
  await expect(team.locator('.members')).toContainText(C.email);
  expect(rows.team_members).toContainEqual({ team_id: 't1', user_id: C.user_id, role: 'coach' });

  await team.locator(`select[data-id="${M.user_id}"]`).selectOption('coach');
  await expect(page.locator('#toast, .toast').first()).toContainText('Role changed');
  expect((rows.team_members ?? []).find((m) => m.user_id === M.user_id)?.role).toBe('coach');

  await page
    .locator(`.admin-club select[data-change="admin-club-role"][data-id="${C.user_id}"]`)
    .selectOption('manager');
  await expect
    .poll(() => (rows.club_members ?? []).find((m) => m.user_id === C.user_id)?.role)
    .toBe('manager');
  expect(errors).toEqual([]);
});
