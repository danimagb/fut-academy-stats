import { t } from '@/shared/i18n/i18n';

/**
 * The top bar of a screen. `back` is the link of the ‹ button; `menu` is optional HTML for the
 * items of a ⋯ menu on the right; `extra` is shown right after the title (e.g. a "Read-only" pill).
 */
export function bar(title: string, back?: string | null, menu = '', extra = ''): string {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="${t('back')}">‹</a>` : ''}<h1>${title}</h1>${extra}${
    menu
      ? `
    <div class="menu">
      <button class="menu-btn" data-action="menu-toggle" aria-label="${t('menu')}" aria-haspopup="true" aria-expanded="false">⋯</button>
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
