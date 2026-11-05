import { t } from '@/shared/i18n/i18n';

export type ConfirmOptions = {
  /** HTML. */
  title?: string;
  /** HTML. */
  message?: string;
  /** Label of the confirm button (HTML). */
  ok: string;
  danger?: boolean;
  cancel?: boolean;
};

/** A styled replacement for confirm(): resolves true only when the user taps the confirm button. */
export function askConfirm({
  title,
  message,
  ok,
  danger = false,
  cancel = true,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'dialog';
    el.innerHTML = `
      <div class="dialog-backdrop" data-v="0"></div>
      <div class="dialog-box" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        ${title ? `<h3 id="dialog-title">${title}</h3>` : ''}
        ${message ? `<p ${title ? 'class="muted"' : 'id="dialog-title"'}>${message}</p>` : ''}
        <div class="row gap">
          ${cancel ? `<button class="btn ghost grow" data-v="0">${t('cancel')}</button>` : ''}
          <button class="btn grow ${danger ? 'danger-fill' : 'primary'}" data-v="1">${ok}</button>
        </div>
      </div>`;
    const done = (v: boolean) => {
      el.remove();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('hashchange', onHash);
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        done(false);
      }
    };
    const onHash = () => done(false);
    el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-v]');
      if (!b) return;
      e.stopPropagation();
      done(b.dataset.v === '1');
    });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('hashchange', onHash);
    document.body.appendChild(el);
    el.querySelector<HTMLElement>('.dialog-box .btn')?.focus({ preventScroll: true });
  });
}

/** A styled replacement for alert(): one message and an OK button. `message` is HTML. */
export const notify = (message: string, title = ''): Promise<boolean> =>
  askConfirm({ title, message, ok: t('ok'), cancel: false });
