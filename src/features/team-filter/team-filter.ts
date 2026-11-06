// Which team (and season) a list shows: native pickers, so they work with any number of teams
// (the phone's own picker), teams grouped by club. A <select data-pick="action"> runs that
// action with the chosen value as `id` (see app/boot).
import { teamGroups } from '@/data/clubs';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { esc } from '@/shared/lib/html';

const option = (value: string, label: string, on: string): string =>
  `<option value="${esc(value)}" ${value === on ? 'selected' : ''}>${esc(label)}</option>`;

/** Options for every team, grouped by club (the age group only), then those on this phone. */
function teamOptions(on: string): string {
  const groups = teamGroups();
  if (!groups.some((g) => g.clubId))
    return groups
      .flatMap((g) => g.teams)
      .map((tm) => option(tm.id, teamLabel(tm), on))
      .join('');
  return groups
    .map(
      (g) =>
        `<optgroup label="${esc(g.clubId ? g.name : t('onThisPhone'))}">${g.teams
          .map((tm) => option(tm.id, g.clubId ? tm.name || t('unnamedTeam') : teamLabel(tm), on))
          .join('')}</optgroup>`,
    )
    .join('');
}

export type TeamPicker = {
  /** The action run with the chosen team's id ('' = all teams). */
  action: string;
  /** The team shown now ('' = all). */
  value: string;
  /** Offer "All teams" first. */
  all?: boolean;
  /** The chosen team's crest (HTML), shown before the select. */
  crestHtml?: string;
};

/** A team picker: the chosen team's crest and a select. */
export function teamPicker({ action, value, all = false, crestHtml = '' }: TeamPicker): string {
  return `<div class="picker team-picker">
    ${crestHtml}
    <select class="grow" data-pick="${action}" aria-label="${t('team')}">
      ${all ? option('', t('allTeams'), value) : ''}
      ${teamOptions(value)}
    </select>
  </div>`;
}

/** A season picker ('2026/2027' …). */
export function seasonPicker(action: string, seasons: readonly string[], value: string): string {
  return `<div class="picker season-picker">
    <select class="grow" data-pick="${action}" aria-label="${t('pdfSeason')}">
      ${seasons.map((s) => option(s, `${t('pdfSeason')} ${s}`, value)).join('')}
    </select>
  </div>`;
}
