import { t } from '@/shared/i18n/i18n';
import { bar } from './bar';
import { main } from './main';

/** Shown when a link points at a game (or team) that is gone. */
export function notFound(): void {
  main.innerHTML = `${bar(t('notFound'), '#/games')}<p class="empty">${t('gameGone')}</p>`;
}
