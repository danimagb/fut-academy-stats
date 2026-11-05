// The games list (the start screen): every game, newest first, with a team filter when there
// is more than one team.
import { gamesTeam, setGamesTeam } from '@/data/prefs';
import { derive } from '@/data/queries';
import { db } from '@/data/store';
import { fmtDate, matchTitle, teamLabel } from '@/domain/titles';
import type { Game } from '@/domain/types';
import { scoreHtml } from '@/features/score/score';
import { t } from '@/shared/i18n/i18n';
import { $ } from '@/shared/lib/dom';
import { esc } from '@/shared/lib/html';
import { rerender } from '@/shared/lib/rerender';
import { bar } from '@/shared/ui/bar';

function gameCard(g: Game): string {
  const d = derive(g);
  const href = g.status === 'finished' ? `#/report/${g.id}` : `#/game/${g.id}`;
  // Result of a finished game: win / draw / loss, shown as a coloured stripe and a pill.
  const res = g.status === 'finished' ? (d.us > d.them ? 'win' : d.us < d.them ? 'loss' : 'draw') : '';
  // Our goals green, theirs red, both neutral on a draw.
  const score = scoreHtml(g, d, '–', true);
  // Only what helps pick a game out of the list (the title already names the team): date and round.
  const meta = [esc(fmtDate(g)), g.round ? t('roundN', { n: esc(g.round) }) : ''].filter(Boolean).join(' · ');
  return `<li><a class="card game ${res}" href="${href}">
    <div class="grow">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${meta}</div>
    </div>
    <div class="right">
      ${g.status !== 'scheduled' ? `<div class="score">${score}</div>` : ''}
      ${res ? `<span class="badge result ${res}">${t(`res_${res}`)}</span>` : `<span class="badge ${g.status}">${t(`st_${g.status}`)}</span>`}
    </div>
  </a></li>`;
}

export function viewGames(): void {
  const main = $('#main');
  if (!main) return;
  const team = gamesTeam();
  const games = db.games
    .filter((g) => !team || g.teamId === team)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  main.innerHTML = `
    ${bar('⚽ Fut Academy Stats')}
    <div class="row gap">
      <a class="btn primary grow" href="#/new">${t('newGame')}</a>
      <a class="btn" href="#/teams">${t('teamsBtn', { n: db.teams.length })}</a>
    </div>
    ${
      db.teams.length > 1
        ? `<div class="pick-row filter" role="tablist">
      ${[['', t('allTeams')], ...db.teams.map((tm) => [tm.id, esc(teamLabel(tm))])]
        .map(
          ([id, label]) =>
            `<button class="pick ${id === team ? 'on' : ''}" role="tab" aria-selected="${id === team}" data-action="games-team" data-id="${id}">${label}</button>`,
        )
        .join('')}
    </div>`
        : ''
    }
    ${
      games.length
        ? `<ul class="list">${games.map(gameCard).join('')}</ul>`
        : `<p class="empty">${team ? t('noGamesTeam') : t('noGames')}</p>`
    }`;
}

/** The games list: its screen and its actions (app/ registers them at startup). */
export const gamesPage = {
  views: { games: viewGames },
  actions: {
    'games-team': ({ id }: DOMStringMap) => {
      setGamesTeam(id ?? '');
      rerender();
    },
  },
};
