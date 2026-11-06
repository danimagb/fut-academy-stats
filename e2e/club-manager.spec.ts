import { expect, test } from '@playwright/test';
import { signInAs } from './cloud-stub';
import { watchErrors } from './helpers';

// A club manager (Coordenador) of Padroense FC, with one team and two other people in the club.
const ME = { id: '00000000-0000-0000-0000-0000000000e1', email: 'coord@example.com' };
const ANA = { user_id: '00000000-0000-0000-0000-0000000000a1', email: 'ana@example.com', is_admin: false };
const BRUNO = {
  user_id: '00000000-0000-0000-0000-0000000000b2',
  email: 'bruno@example.com',
  is_admin: false,
};
const ROW = { deleted_at: null, updated_at: '2026-11-01T10:00:00Z' };
const club = (myRole = 'manager', myTeamRole: string | null = null) => ({
  accounts: [{ user_id: ME.id, email: ME.email, is_admin: false }, ANA, BRUNO],
  clubs: [{ id: 'c1', name: 'Padroense FC', short_name: 'PFC' }],
  club_members: [
    { club_id: 'c1', user_id: ME.id, role: myRole },
    { club_id: 'c1', user_id: ANA.user_id, role: 'staff' },
    { club_id: 'c1', user_id: BRUNO.user_id, role: 'staff' },
  ],
  teams: [{ id: 't1', club_id: 'c1', club: 'Padroense FC', name: 'Sub-7B', ...ROW }],
  team_members: [
    { team_id: 't1', user_id: ANA.user_id, role: 'manager' },
    ...(myTeamRole ? [{ team_id: 't1', user_id: ME.id, role: myTeamRole }] : []),
  ],
  players: [],
  games: [],
});

test('the teams list groups cloud teams by club, with the club page for its coordinators', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signInAs(page, ME, { is_admin: false }, club());
  await page.goto('#/teams');
  const heading = page.locator('h2.team-group');
  await expect(heading).toContainText('Padroense FC');
  await expect(heading).toContainText('(PFC)');
  await heading.getByRole('link', { name: '⚙ Club' }).click();
  await expect(page).toHaveURL(/#\/club\/c1/);
  await expect(page.locator('.club-people')).toContainText(ANA.email);
  await expect(page.locator('.club-people')).toContainText('Sub-7B (Director)');
  await expect(page.locator('.club-people')).toContainText(`Staff · no team yet`);
  expect(errors).toEqual([]);
});

test('a coordinator sets the short name, and the team screen and games filter use it', async ({ page }) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ME, { is_admin: false }, club());
  await page.goto('#/club/c1');
  await page.locator('input[name="short"]').fill('PADR');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#toast')).toContainText('Saved');
  expect(rows.clubs?.[0]?.short_name).toBe('PADR');
  await page.goto('#/team/t1');
  await expect(page.locator('.bar h1')).toHaveText('PADR - Sub-7B');
  expect(errors).toEqual([]);
});

test("a coordinator picks staff from the club's people, filters them and changes a role", async ({
  page,
}) => {
  const errors = watchErrors(page);
  const rows = await signInAs(page, ME, { is_admin: false }, club());
  await page.goto('#/team/t1');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Staff' }).click();
  await expect(page.locator('#people')).toContainText(ANA.email);
  await page.locator('[data-action="add-staff-open"]').click();
  const sheet = page.locator('#sheet');
  // Ana is already in the team; Bruno and I can be added.
  await expect(sheet.locator('#staff-pick')).toContainText(`${ANA.email}in the team`);
  await sheet.locator('[data-filter="staff"]').fill('brun');
  await expect(sheet.locator('.staff-pick-row:visible')).toHaveCount(1);
  await sheet.locator('[data-filter="staff"]').fill('nobody');
  await expect(sheet.locator('#staff-none')).toBeVisible();
  await sheet.locator('[data-filter="staff"]').fill('brun');
  await sheet.getByLabel('Director').check();
  await sheet.getByRole('button', { name: BRUNO.email }).click();
  await expect(sheet.locator('#staff-pick')).toContainText(`${BRUNO.email}in the team`);
  expect(rows.team_members).toContainEqual({ team_id: 't1', user_id: BRUNO.user_id, role: 'manager' });
  await sheet.getByRole('button', { name: 'Done' }).click();

  await page.locator(`#people select[data-id="${ANA.user_id}"]`).selectOption('coach');
  await expect.poll(() => rows.team_members?.find((m) => m.user_id === ANA.user_id)?.role).toBe('coach');
  expect(errors).toEqual([]);
});

test('a team manager edits players but not the team, its club or its staff', async ({ page }) => {
  const errors = watchErrors(page);
  await signInAs(page, ME, { is_admin: false }, club('staff', 'manager'));
  await page.goto('#/team/t1');
  await expect(page.locator('#main')).toContainText('Sub-7B');
  await expect(page.locator('input[data-team]')).toHaveCount(0);
  await expect(page.locator('[data-action="add-player"]')).toHaveCount(1);
  await expect(page.locator('[data-action="add-staff-open"]')).toHaveCount(0);
  await expect(page.locator('[data-action="delete-team"]')).toHaveCount(0);
  await page.goto('#/teams');
  await expect(page.getByRole('link', { name: '⚙ Club' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a coordinator of two clubs chooses where a new team goes', async ({ page }) => {
  const errors = watchErrors(page);
  const data = club();
  data.clubs.push({ id: 'c2', name: 'Outro FC', short_name: '' });
  data.club_members.push({ club_id: 'c2', user_id: ME.id, role: 'manager' });
  const rows = await signInAs(page, ME, { is_admin: false }, data);
  await page.goto('#/teams');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '+ New team' }).click();
  await expect(page.locator('#sheet')).toContainText('Where does the new team go?');
  await page.locator('#sheet').getByRole('button', { name: 'Outro FC' }).click();
  await expect(page).toHaveURL(/#\/team\//);
  await expect.poll(() => rows.teams?.filter((tm) => tm.club_id === 'c2').length).toBe(1);
  expect(errors).toEqual([]);
});
