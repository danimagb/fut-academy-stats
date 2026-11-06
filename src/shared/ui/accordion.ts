import { t } from '@/shared/i18n/i18n';
import { esc } from '@/shared/lib/html';

export type AccSection = {
  /** Section id (the `data-v` of the toggle and the ids of its parts). */
  id: string;
  /** Title (HTML). */
  title: string;
  /** One line under the title (text), e.g. "3 players". */
  summary: string;
  open: boolean;
  /** The action that opens / closes it (`data-v` = id). */
  toggle: string;
  /** The action of a ＋ Add button next to the header ('' for none). */
  add?: string;
  /** Extra data attributes for the Add button, e.g. `data-cid="c1"` (HTML). */
  addData?: string;
  /** The section's content (HTML). */
  body: string;
};

/** A collapsible section (team screen, club page): a header with a summary and an optional ＋ Add. */
export function accSection({
  id,
  title,
  summary,
  open,
  toggle,
  add = '',
  addData = '',
  body,
}: AccSection): string {
  return `
    <section class="acc ${open ? 'open' : ''}">
      <div class="acc-top">
        <button class="acc-head" data-action="${toggle}" data-v="${id}" aria-expanded="${open}" aria-controls="acc-${id}">
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          <span class="grow"><span class="acc-title">${title}</span><span class="acc-sum" id="${id}-sum">${esc(summary)}</span></span>
        </button>
        ${add ? `<button class="btn small acc-add" data-action="${add}" ${addData}>＋ ${t('add')}</button>` : ''}
      </div>
      <div class="acc-body" id="acc-${id}" ${open ? '' : 'hidden'}>${body}</div>
    </section>`;
}
