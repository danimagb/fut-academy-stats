import { describe, expect, it } from 'vitest';
import { HINT_AGAIN_DAYS, installHint } from './install-app';

const NOW = Date.UTC(2026, 10, 7, 12);
const DAY = 24 * 60 * 60 * 1000;
const base = { standalone: false, canPrompt: false, menuOnly: false, closedAt: null, now: NOW };
const closedDaysAgo = (days: number) => installHint({ ...base, menuOnly: true, closedAt: NOW - days * DAY });

describe('installHint', () => {
  it('offers the install button where the browser can install the app', () => {
    expect(installHint({ ...base, canPrompt: true })).toBe('prompt');
  });

  it('offers how-to-install steps where it can only be added from the browser menus (iPhone)', () => {
    expect(installHint({ ...base, menuOnly: true })).toBe('howto');
  });

  it('shows nothing where the browser can install it only by itself (Chrome before it says it can)', () => {
    expect(installHint(base)).toBeNull();
  });

  it('shows nothing once the app is opened from the home screen', () => {
    expect(installHint({ ...base, standalone: true, canPrompt: true, menuOnly: true })).toBeNull();
  });

  it(`stays hidden for ${HINT_AGAIN_DAYS} days after it is closed, then comes back`, () => {
    expect(closedDaysAgo(1)).toBeNull();
    expect(closedDaysAgo(HINT_AGAIN_DAYS - 0.01)).toBeNull();
    expect(closedDaysAgo(HINT_AGAIN_DAYS)).toBe('howto');
  });
});
