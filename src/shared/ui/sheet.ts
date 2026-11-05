import { $ } from '@/shared/lib/dom';

/** Opens the bottom sheet with this HTML (it replaces what was there). */
export function openSheet(html: string): void {
  const body = $('#sheet-body');
  const sheet = $('#sheet');
  if (!body || !sheet) return;
  body.innerHTML = html;
  sheet.hidden = false;
}

export function closeSheet(): void {
  const sheet = $('#sheet');
  if (sheet) sheet.hidden = true;
}

/** Whether the bottom sheet is open. */
export const isSheetOpen = (): boolean => $('#sheet')?.hidden === false;
