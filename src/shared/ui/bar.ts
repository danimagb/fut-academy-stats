import { t } from '@/shared/i18n/i18n';

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
const DOTS =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>';

/**
 * The top bar of a screen. `back` is the link of the round back button; `menu` is optional HTML for the
 * items of a ⋯ menu on the right; `extra` is shown right after the title (e.g. a "Read-only" pill).
 */
export function bar(title: string, back?: string | null, menu = '', extra = ''): string {
  return `<header class="bar">${back ? `<a class="back round-btn" href="${back}" aria-label="${t('back')}">${CHEVRON}</a>` : ''}<h1>${title}</h1>${extra}${
    menu
      ? `
    <div class="menu">
      <button class="menu-btn round-btn" data-action="menu-toggle" aria-label="${t('menu')}" aria-haspopup="true" aria-expanded="false">${DOTS}</button>
      <div class="menu-list" role="menu" hidden>${menu}</div>
    </div>`
      : ''
  }</header>`;
}

/** Closes any open ⋯ menu. */
export function closeMenus(): void {
  for (const m of document.querySelectorAll<HTMLElement>('.menu-list:not([hidden])')) {
    m.hidden = true;
    m.previousElementSibling?.setAttribute('aria-expanded', 'false');
  }
}
