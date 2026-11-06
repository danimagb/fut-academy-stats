// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// The bottom tab bar (Team, Matches, Stats, Profile, and Admin for the admin).
import { $ } from '@/shared/lib/dom';
import { cloud } from '@/data/session';
import { db } from '@/data/store';
import { t } from '@/shared/i18n/i18n';

// ---------- Bottom tab bar ----------

export const TAB_ICONS = {
  team: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/>',
  matches:
    '<circle cx="12" cy="12" r="9"/><path class="f" d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z"/><path d="M12 3v4.5M20.6 9.2l-4.3 1.4M17.3 19.4l-2.6-3.8M6.7 19.4l2.6-3.8M3.4 9.2l4.3 1.4"/>',
  stats: '<path d="M5 20V12M10 20V5M15 20V9M20 20V14"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  admin: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
};

export function renderTabbar(view) {
  const active = ['teams', 'team', 'players'].includes(view)
    ? 'team'
    : ['stats', 'player'].includes(view)
      ? 'stats'
      : ['profile', 'admin'].includes(view)
        ? view
        : 'matches';
  const isAdmin = !!(cloud.session && cloud.account?.isAdmin && !cloud.needsPassword);
  const myTeam = db.teams.length === 1 ? `#/team/${db.teams[0].id}` : '#/teams';
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[k]}</svg>`;
  const tab = (k, label, attrs) =>
    `<${attrs.startsWith('href') ? 'a' : 'button'} class="tab ${active === k ? 'on' : ''}" ${attrs}>${icon(k)}<span>${label}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
  $('#tabbar').innerHTML =
    tab('team', t('tabTeam'), `href="${myTeam}"`) +
    tab('matches', t('tabMatches'), 'href="#/games"') +
    tab('stats', t('tabStats'), 'href="#/stats"') +
    tab('profile', t('tabProfile'), 'href="#/profile"') +
    (isAdmin ? tab('admin', t('tabAdmin'), 'href="#/admin" data-admin-link') : '');
  $('#tabbar').classList.toggle('five', isAdmin);
}
