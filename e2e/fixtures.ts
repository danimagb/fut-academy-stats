import { test as base, expect } from '@playwright/test';
import { signInAs } from './cloud-stub';

// The app needs an account: by default every test runs signed in as the coordinator of a club,
// "Test FC", against the in-memory cloud stub (e2e/cloud-stub.ts). `cloud` is the stub's tables.
export const COORDINATOR = { id: '00000000-0000-0000-0000-0000000000c0', email: 'coord@example.com' };
export const CLUB = { id: 'club-test', name: 'Test FC', short_name: '' };

type Tables = Awaited<ReturnType<typeof signInAs>>;

export const test = base.extend<{ cloud: Tables }>({
  cloud: [
    async ({ page }, use) => {
      const rows = await signInAs(
        page,
        COORDINATOR,
        { is_admin: false },
        { clubs: [CLUB], club_members: [{ club_id: CLUB.id, user_id: COORDINATOR.id, role: 'manager' }] },
      );
      await use(rows);
    },
    { auto: true },
  ],
});
export { expect };
