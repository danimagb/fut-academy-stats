import { expect, test } from './fixtures';
import { createTeam, watchErrors } from './helpers';

test('expanded sections close again when the screen is left (team screen, profile)', async ({ page }) => {
  const errors = watchErrors(page);
  await createTeam(page, 2);
  const players = page.locator('[data-action="team-section"][data-v="players"]');
  await expect(players).toHaveAttribute('aria-expanded', 'true'); // opened by adding players
  const url = page.url();
  await page.goto('#/games');
  await page.goto(url);
  await expect(players).toHaveAttribute('aria-expanded', 'false');

  await page.goto('#/profile');
  const sections = page.locator('[data-action="profile-section"]');
  await expect(sections.first()).toHaveAttribute('aria-expanded', 'true'); // Account
  await sections.nth(1).click();
  await expect(sections.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await page.goto('#/games');
  await page.goto('#/profile');
  await expect(sections.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(sections.nth(1)).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});
